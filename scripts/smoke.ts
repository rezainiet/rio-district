/**
 * End-to-end smoke test against a RUNNING server + database.
 *
 *   npm run dev            (in another terminal)
 *   npm run test:smoke
 *
 * Checks: server-side price recalculation, validation, idempotency,
 * atomic stock reservation under concurrency, order-request switch,
 * review submission/moderation/verification/photo gating, countdown and
 * pop-up activation rules. Test orders ("Smoke Test") and test reviews are
 * deleted afterwards and the product/settings it touches are restored.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();

import assert from "node:assert/strict";
import { randomInt, randomUUID } from "node:crypto";
import { unlink } from "node:fs/promises";
import path from "node:path";
import mongoose from "mongoose";
import sharp from "sharp";
import { refuseInProduction } from "./lib/guard";
import { Product } from "../src/models/Product";
import { Order } from "../src/models/Order";
import { Settings, Testimonial } from "../src/models/misc";

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

/** Fresh fake client IP per run, so the per-IP rate limiter never carries over between runs. */
const fakeIp = () => `10.${randomInt(255)}.${randomInt(255)}.${randomInt(1, 255)}`;
const reviewIp = fakeIp();

async function postReview(fields: Record<string, string>, opts: { ip?: string; photos?: Buffer[] } = {}) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  for (const buf of opts.photos ?? []) fd.append("photos", new Blob([new Uint8Array(buf)], { type: "image/png" }), "photo.png");
  const res = await fetch(`${BASE}/api/reviews`, { method: "POST", headers: { Origin: BASE, "X-Real-IP": opts.ip ?? reviewIp }, body: fd });
  return { status: res.status, data: await res.json().catch(() => null) };
}

async function adminCookie() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) return null;
  const res = await fetch(`${BASE}/api/admin/auth/login`, { method: "POST", headers, body: JSON.stringify({ email, password }) });
  const cookie = res.headers.get("set-cookie")?.split(";")[0];
  return res.ok && cookie ? cookie : null;
}

const page = (p: string) => fetch(BASE + p).then((r) => r.text());

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

    await check("customer reviews: validated, moderated, rate-limited, safely gated", async () => {
      const email = `smoke-review-${Date.now()}@example.com`;
      const base = {
        productId: String(noir._id),
        name: "smoke reviewer",
        email,
        rating: "4",
        title: "Smoke review title",
        text: "Smoke test review text <script>alert(1)</script> long enough.",
        consent: "on",
      };
      // Validation: links refused, consent required.
      const spam = await postReview({ ...base, text: "Super veste, allez voir www.promo.xyz maintenant" });
      assert.equal(spam.status, 422);
      assert.ok(spam.data.fields.text);
      assert.equal((await postReview({ ...base, consent: "" })).status, 422);

      // Honeypot: accepted silently, nothing stored.
      assert.equal((await postReview({ ...base, website: "bot" })).status, 201);
      assert.equal(await Testimonial.countDocuments({ email }), 0);

      // Valid submission with a photo → pending, unpublished, not verified, not on the page.
      const png = await sharp({ create: { width: 64, height: 64, channels: 3, background: "#c8a96a" } }).png().toBuffer();
      const ok = await postReview(base, { photos: [png] });
      assert.equal(ok.status, 201, JSON.stringify(ok.data));
      assert.equal(ok.data.verified, false);
      const doc = await Testimonial.findOne({ email }).lean();
      assert.equal(doc!.status, "pending");
      assert.equal(doc!.published, false);
      assert.equal(doc!.photos.length, 1);
      assert.ok(doc!.photos[0].endsWith(".webp"), "photos are re-encoded (metadata stripped)");
      assert.ok(!(await page("/produit/veste-bresil-noir")).includes("Smoke review title"), "pending reviews are hidden");
      assert.equal((await fetch(BASE + doc!.photos[0])).status, 404, "unpublished photo is private");

      // One review per person and jacket (any colour of the same model).
      assert.equal((await postReview({ ...base, productId: String(vert._id) })).status, 409);

      // Order verification: unknown order refused; only a delivered order containing the jacket verifies.
      const unknown = await postReview({ ...base, email: customer.email, orderNumber: "RD-99999" });
      assert.equal(unknown.status, 422);
      assert.ok(unknown.data.fields.orderNumber);
      const r = await post("/api/orders", { idempotencyKey: randomUUID(), lines: single("XS"), customer });
      assert.equal(r.status, 201);
      const notDelivered = await postReview({ ...base, email: customer.email, orderNumber: r.data.order.number });
      assert.equal(notDelivered.status, 422, "only delivered orders verify a review");
      await Order.updateOne({ number: r.data.order.number }, { $set: { status: "fulfilled" } });
      const verified = await postReview({ ...base, email: customer.email, orderNumber: r.data.order.number });
      assert.equal(verified.status, 201, JSON.stringify(verified.data));
      assert.equal(verified.data.verified, true);

      // Moderation through the admin API.
      const cookie = await adminCookie();
      if (cookie) {
        const moderate = (body: unknown) =>
          fetch(`${BASE}/api/admin/testimonials/${doc!._id}`, { method: "PATCH", headers: { ...headers, Cookie: cookie }, body: JSON.stringify(body) });
        assert.equal((await moderate({ action: "publish" })).status, 200);
        const html = await page("/produit/veste-bresil-vert"); // same model, other colour
        assert.ok(html.includes("Smoke review title"), "published review is shown on every colour");
        assert.ok(html.includes("Smoke R."), "only first name + initial is shown");
        assert.ok(!html.includes(email), "the e-mail is never shown");
        assert.ok(!html.includes("<script>alert(1)</script>"), "review text is escaped");
        assert.ok(html.includes('"aggregateRating"'), "rating from published reviews only");
        assert.equal((await fetch(BASE + doc!.photos[0])).status, 200, "published photo is public");
        assert.equal((await moderate({ action: "hide" })).status, 200);
        assert.ok(!(await page("/produit/veste-bresil-noir")).includes("Smoke review title"), "hidden review disappears");
        assert.equal((await fetch(BASE + doc!.photos[0])).status, 404);
        const anon = await fetch(`${BASE}/api/admin/testimonials/${doc!._id}`, { method: "PATCH", headers, body: JSON.stringify({ action: "publish" }) });
        assert.equal(anon.status, 401, "moderation requires an admin session");
      } else {
        console.log("    (modération admin non testée : SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD absents)");
      }

      // Rate limit (3/h in production, ×10 in development) on a separate fake IP.
      const ip = fakeIp();
      const statuses: number[] = [];
      for (let i = 0; i < 32; i++) statuses.push((await postReview({ ...base, rating: "0" }, { ip })).status);
      assert.ok(statuses.includes(429), "submissions are rate-limited");
    });

    await check("countdown: only a real, enabled, unexpired deadline is shown, and it never resets", async () => {
      const set = (countdown: unknown) => Settings.updateOne({ key: "store" }, { $set: { "data.countdown": countdown } });
      const endsAt = new Date(Date.now() + 2 * 86_400_000).toISOString();
      const cd = { enabled: true, title: "Smoke countdown", text: "", ctaLabel: "", ctaHref: "", startsAt: null, endsAt, placement: { home: true, product: false } };
      await set(cd);
      const first = await page("/");
      assert.ok(first.includes("Smoke countdown") && first.includes('role="timer"'));
      const deadline = (html: string) => /Fin de l(?:&#x27;|')offre le ([^"]+)"/.exec(html)?.[1];
      assert.ok(deadline(first));
      await new Promise((res) => setTimeout(res, 1100));
      assert.equal(deadline(await page("/")), deadline(first), "the deadline comes from the server, not the visit");
      assert.ok(!(await page("/produit/veste-bresil-noir")).includes("Smoke countdown"), "placement respected");
      await set({ ...cd, endsAt: new Date(Date.now() - 1000).toISOString() });
      assert.ok(!(await page("/")).includes("Smoke countdown"), "expired countdown disappears");
      await set({ ...cd, enabled: false });
      assert.ok(!(await page("/")).includes("Smoke countdown"), "disabled countdown is hidden");
      await set({ ...cd, endsAt: null });
      assert.ok(!(await page("/")).includes("Smoke countdown"), "no deadline, no countdown");

      // Prices are unchanged whatever a campaign says.
      const q = await post("/api/cart/quote", { lines: single("L") }); // M was sold out by the stock test
      assert.equal(q.data.quote.totalCents, 1999);

      const cookie = await adminCookie();
      if (cookie) {
        const res = await fetch(`${BASE}/api/admin/promotions`, {
          method: "PUT",
          headers: { ...headers, Cookie: cookie },
          body: JSON.stringify({ countdown: { ...cd, endsAt: null }, popups: {} }),
        });
        assert.equal(res.status, 422, "an enabled countdown without an end date is refused");
      }
    });

    await check("pop-ups reach the page only when enabled and filled in", async () => {
      const welcome = { enabled: true, title: "Smoke welcome", text: "Smoke message", ctaLabel: "Voir", ctaHref: "/#collection", imageUrl: "", frequencyDays: 30, startsAt: null, endsAt: null, delaySeconds: 10 };
      const set = (w: unknown) => Settings.updateOne({ key: "store" }, { $set: { "data.popups.welcome": w } });
      await set(welcome);
      assert.ok((await page("/")).includes("Smoke welcome"));
      await set({ ...welcome, text: "" });
      assert.ok(!(await page("/")).includes("Smoke welcome"), "incomplete pop-up is not sent");
      await set({ ...welcome, enabled: false });
      assert.ok(!(await page("/")).includes("Smoke welcome"), "disabled pop-up is not sent");
      await set({ ...welcome, endsAt: new Date(Date.now() - 1000).toISOString() });
      assert.ok(!(await page("/")).includes("Smoke welcome"), "ended pop-up is not sent");
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
    const reviews = await Testimonial.find({ $or: [{ email: /^smoke-review-/ }, { email: customer.email }] }).lean();
    for (const r of reviews) {
      for (const url of r.photos ?? []) {
        await unlink(path.resolve(process.env.UPLOAD_DIR || ".data/uploads", "reviews", path.basename(url))).catch(() => {});
      }
    }
    await Testimonial.deleteMany({ _id: { $in: reviews.map((r) => r._id) } });
    await mongoose.disconnect();
  }
  console.log(`\n${passed} vérifications réussies.`);
}

main().catch(async (err) => {
  console.error("✗", err);
  await mongoose.disconnect();
  process.exit(1);
});
