/**
 * End-to-end smoke test against a RUNNING server + database.
 *
 *   npm run dev            (in another terminal)
 *   npm run test:smoke
 *
 * Checks: server-side price recalculation, validation, idempotency,
 * atomic stock reservation under concurrency,
 * order-request switch. Test orders ("Smoke Test") are deleted afterwards
 * and the product/settings it touches are restored.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { refuseInProduction } from "./lib/guard";
import { Product } from "../src/models/Product";
import { Order } from "../src/models/Order";
import { Settings } from "../src/models/misc";

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const headers = { "Content-Type": "application/json", Origin: BASE };

const customer = {
  fullName: "Smoke Test",
  email: "smoke@example.com",
  phone: "0612345678",
  address: "1 rue du Test",
  postalCode: "75001",
  city: "Paris",
  country: "FR",
};

async function post(path: string, body: unknown) {
  const res = await fetch(BASE + path, { method: "POST", headers, body: JSON.stringify(body) });
  return { status: res.status, data: await res.json().catch(() => null) };
}

let passed = 0;
async function check(name: string, fn: () => Promise<void>) {
  await fn();
  passed++;
  console.log(`  ✓ ${name}`);
}

async function main() {
  // Creates test orders and temporarily changes stock/settings: never against production.
  refuseInProduction("Le smoke test");
  await mongoose.connect(process.env.MONGODB_URI!);
  const noir = await Product.findOne({ slug: "veste-bresil-noir" });
  const vert = await Product.findOne({ slug: "veste-bresil-vert" });
  assert(noir && vert, "Seed manquant : lance npm run seed");
  const originalSizes = noir.sizes.map((s) => ({ label: s.label, enabled: s.enabled, stock: s.stock }));
  const settingsBefore = await Settings.findOne({ key: "store" }).lean();

  const single = (size = "M") => [{ kind: "single", productId: String(noir._id), size, quantity: 1 }];

  try {
    await check("tampered prices are ignored by the server", async () => {
      const r = await post("/api/cart/quote", {
        lines: [{ kind: "bundle", items: [{ productId: String(noir._id), size: "M" }, { productId: String(vert._id), size: "L" }], quantity: 1, unitPriceCents: 1 }],
      });
      assert.equal(r.status, 200);
      assert.equal(r.data.quote.totalCents, 2495);
    });

    await check("invalid customer data is rejected (422)", async () => {
      const r = await post("/api/orders", { idempotencyKey: randomUUID(), lines: single(), customer: { ...customer, email: "x", postalCode: "12" } });
      assert.equal(r.status, 422);
      assert.ok(r.data.fields["customer.email"]);
      assert.ok(r.data.fields["customer.postalCode"]);
    });

    await check("same idempotency key never creates two orders", async () => {
      const key = randomUUID();
      const [a, b] = await Promise.all([
        post("/api/orders", { idempotencyKey: key, lines: single("S"), customer }),
        post("/api/orders", { idempotencyKey: key, lines: single("S"), customer }),
      ]);
      assert.ok([200, 201].includes(a.status) && [200, 201].includes(b.status), `${a.status}/${b.status}`);
      assert.equal(a.data.order.number, b.data.order.number);
      assert.equal(await Order.countDocuments({ idempotencyKey: key }), 1);
      const order = await Order.findOne({ idempotencyKey: key });
      assert.equal(order!.paymentStatus, "awaiting_payment_setup");
      assert.equal(order!.status, "pending_confirmation");
    });

    await check("orders are created unpaid and cannot become paid from outside", async () => {
      const r = await post("/api/orders", {
        idempotencyKey: randomUUID(),
        lines: single("XL"),
        customer,
        paymentStatus: "paid",
        status: "confirmed",
      });
      assert.equal(r.status, 201);
      assert.equal(r.data.order.paymentStatus, "awaiting_payment_setup");
      const order = await Order.findOne({ number: r.data.order.number }).lean();
      assert.equal(order!.paymentStatus, "awaiting_payment_setup");
      assert.equal(order!.status, "pending_confirmation");
      assert.equal(order!.payment?.paidAt ?? null, null);
      assert.equal(order!.payment?.provider ?? null, null);

      // No provider is configured: the webhook cannot mark anything paid.
      const hook = await fetch(`${BASE}/api/payments/webhook/stripe`, {
        method: "POST",
        headers,
        body: JSON.stringify({ type: "succeeded", orderNumber: order!.number }),
      });
      assert.equal(hook.status, 501);
      assert.equal((await Order.findById(order!._id).lean())!.paymentStatus, "awaiting_payment_setup");

      // The customer's confirmation page states it plainly.
      const page = await fetch(`${BASE}/commande/confirmation/${order!.publicToken}`).then((x) => x.text());
      assert.ok(page.includes("Non payée"), "confirmation page must say the order is unpaid");

      // Admin endpoints need a session.
      const adminPatch = await fetch(`${BASE}/api/admin/orders/${order!._id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ action: "payment", paymentStatus: "paid" }),
      });
      assert.equal(adminPatch.status, 401);
    });

    await check("concurrent orders cannot oversell the last unit", async () => {
      await Product.updateOne({ _id: noir._id }, { $set: { "sizes.$[s].stock": 1 } }, { arrayFilters: [{ "s.label": "M" }] });
      const results = await Promise.all(
        Array.from({ length: 5 }, () => post("/api/orders", { idempotencyKey: randomUUID(), lines: single("M"), customer })),
      );
      const ok = results.filter((r) => r.status === 201);
      const refused = results.filter((r) => r.status === 409);
      assert.equal(ok.length, 1, JSON.stringify(results.map((r) => r.status)));
      assert.equal(refused.length, 4);
      const after = await Product.findById(noir._id).lean();
      assert.equal(after!.sizes.find((s) => s.label === "M")!.stock, 0);

      // Sold-out size is refused before reservation too.
      const again = await post("/api/orders", { idempotencyKey: randomUUID(), lines: single("M"), customer });
      assert.equal(again.status, 409);

      // Cancellation restock is covered by the admin flow (see docs/QA.md).
      const winner = await Order.findOne({ number: ok[0].data.order.number });
      assert.equal(winner!.stockReserved, true);
    });

    await check("order requests can be switched off", async () => {
      await Settings.updateOne({ key: "store" }, { $set: { "data.orders.acceptingOrders": false } });
      const r = await post("/api/orders", { idempotencyKey: randomUUID(), lines: single("L"), customer });
      assert.equal(r.status, 403);
    });
  } finally {
    await Product.updateOne({ _id: noir._id }, { $set: { sizes: originalSizes } });
    if (settingsBefore) await Settings.updateOne({ key: "store" }, { $set: { data: settingsBefore.data } });
    await Order.deleteMany({ "customer.email": customer.email });
    await mongoose.disconnect();
  }
  console.log(`\n${passed} vérifications réussies.`);
}

main().catch(async (err) => {
  console.error("✗", err);
  await mongoose.disconnect();
  process.exit(1);
});
