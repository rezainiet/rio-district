import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { NextRequest } from "next/server";
import { mockEnvironment, seedTestDatabase, assertTestUri } from "../../scripts/lib/everflow-fixture";

test("isolated order API: variants, duplicate/concurrent submissions, retry, fallback and refusal paths", async () => {
  const uri = `mongodb://127.0.0.1:27017/rio_everflow_test_${randomUUID().replaceAll("-", "")}`;
  Object.assign(process.env, mockEnvironment(uri));
  const fixture = await seedTestDatabase(uri);
  try {
    const { POST } = await import("../../src/app/api/orders/route");
    const { POST: resume } = await import("../../src/app/api/payments/checkout/route");
    const { POST: webhook } = await import("../../src/app/api/payments/webhook/[provider]/route");
    const { applyPaymentEvent } = await import("../../src/lib/payments/apply");
    const { Order } = await import("../../src/models/Order");
    const { Product } = await import("../../src/models/Product");
    const { PaymentAttempt, Settings } = await import("../../src/models/misc");
    const { createOrderRequest, updateOrderStatus, updatePaymentStatus } = await import("../../src/lib/orders");
    const { orderRequestSchema } = await import("../../src/lib/validation");
    const customer = { firstName: "Élodie-Anne", lastName: "de la Fiction", email: "fiction@example.com", phone: "+33 6 00 00 00 00", address: "12 rue de la Fiction", address2: "Bâtiment Test", postalCode: "75001", city: "Paris", country: "FR" };
    const single = (index = 0, size = "M") => [{ kind: "single" as const, productId: fixture.products[index].id, size, quantity: 1 }];
    const bundle = (a: number, sa: string, b: number, sb: string) => [{ kind: "bundle" as const, items: [{ productId: fixture.products[a].id, size: sa }, { productId: fixture.products[b].id, size: sb }], quantity: 1 }];
    const request = (path: string, body: unknown) => new NextRequest(`http://localhost:3001${path}`, { method: "POST", headers: { origin: "http://localhost:3001", host: "localhost:3001", "content-type": "application/json" }, body: JSON.stringify(body) });
    const payload = (lines: unknown = single()) => ({ idempotencyKey: randomUUID(), lines, customer, website: "" });
    const submit = async (body: unknown) => { const response = await POST(request("/api/orders", body)); return { status: response.status, data: await response.json() }; };
    const stock = async (index: number, size: string) => (await Product.findById(fixture.products[index].id).lean())!.sizes.find(s => s.label === size)!.stock!;
    const key = { ...payload(), requireCheckout: true }; const before = await stock(0, "M");
    const simultaneous = await Promise.all(Array.from({ length: 5 }, () => submit(key)));
    assert.ok(simultaneous.every(r => r.status === 200 || r.status === 201));
    assert.equal(new Set(simultaneous.map(r => r.data.order.token)).size, 1);
    assert.equal(await Order.countDocuments({ idempotencyKey: key.idempotencyKey }), 1);
    assert.equal(await stock(0, "M"), before - 1);
    const token = simultaneous[0].data.order.token;
    const order = await Order.findOne({ publicToken: token }).lean(); assert.ok(order);
    assert.equal(order.paymentStatus, "pending"); assert.equal(order.status, "pending_confirmation");
    assert.equal(order.customer.fullName, "Élodie-Anne de la Fiction");
    const attempt = await PaymentAttempt.findOne({ order: order._id }).lean(); assert.ok(attempt);
    assert.equal(await PaymentAttempt.countDocuments({ order: order._id }), 1); assert.equal(attempt.raw, null);
    assert.equal(attempt.status, "pending"); assert.equal(attempt.correlationSent, false);
    assert.match(simultaneous[0].data.checkout.redirectUrl, /^\/commande\/paiement-test\//);
    assert.equal((await submit({ ...key, customer: { ...customer, city: "Lyon" } })).status, 409);
    for (let i = 0; i < 3; i++) assert.equal((await resume(request("/api/payments/checkout", { token }))).status, 200);
    // A derived fullName and the form resolver's explicit equivalent must reuse
    // the same order, including orders carrying the previous fingerprint format.
    const explicitName = { ...key, customer: { ...customer, fullName: "Élodie-Anne de la Fiction" } };
    assert.equal((await submit(explicitName)).status, 200);
    const legacyInput = orderRequestSchema.parse(key);
    const legacyFingerprint = createHash("sha256").update(JSON.stringify({ lines: legacyInput.lines,
      customer: legacyInput.customer, marketingConsent: legacyInput.marketingConsent, hosted: true })).digest("hex");
    await Order.updateOne({ _id: order._id }, { $set: { requestFingerprint: legacyFingerprint } });
    assert.equal((await submit(explicitName)).status, 200);
    assert.equal((await submit(key)).status, 200);
    assert.equal((await submit({ ...explicitName, customer: { ...explicitName.customer, city: "Lyon" } })).status, 409);
    assert.equal(await Order.countDocuments({ idempotencyKey: key.idempotencyKey }), 1);
    assert.equal(await stock(0, "M"), before - 1); assert.equal(await PaymentAttempt.countDocuments({ order: order._id }), 1);
    assert.equal((await resume(request("/api/payments/checkout", { token: "x".repeat(24) }))).status, 404);
    assert.equal((await resume(request("/api/payments/checkout", { token: "bad" }))).status, 422);
    // All required single/bundle variant combinations, including identical product/size.
    const variants = [single(2, "XL"), single(5, "3XL"), bundle(0, "M", 2, "L"), bundle(1, "S", 3, "XL"), bundle(0, "S", 0, "L"), bundle(0, "XS", 0, "XS")];
    for (const lines of variants) {
      const result = await submit(payload(lines)); assert.equal(result.status, 201, result.data.error);
      const saved = await Order.findOne({ publicToken: result.data.order.token }).lean(); assert.ok(saved);
      const expected = lines[0].kind === "single" ? [lines[0]] : (lines[0] as ReturnType<typeof bundle>[0]).items;
      assert.deepEqual(saved.lines[0].items.map(i => ({ productId: String(i.product), size: i.size })), expected.map(i => ({ productId: i.productId, size: i.size })));
      assert.equal(saved.totalCents, lines[0].kind === "single" ? 1999 : 2495);
    }
    const count = await Order.countDocuments();
    for (const lines of [[...single(), ...single(2)], [{ ...single()[0], quantity: 2 }], [...bundle(0, "M", 2, "L"), ...single()], [{ ...bundle(0, "M", 2, "L")[0], quantity: 2 }], [{ ...single()[0], productId: "f".repeat(24) }], [{ ...single()[0], size: "NO" }]]) assert.ok((await submit(payload(lines))).status >= 400);
    assert.equal(await Order.countDocuments(), count);
    await Product.updateOne({ _id: fixture.products[4].id }, { $set: { "sizes.$[s].stock": 0 } }, { arrayFilters: [{ "s.label": "XXL" }] });
    assert.equal((await submit(payload(single(4, "XXL")))).status, 409); assert.equal(await Order.countDocuments(), count);
    process.env.EVERFLOW_SINGLE_CHECKOUT_URL = "https://evil.example/";
    assert.equal((await submit(payload())).status, 409); assert.equal(await Order.countDocuments(), count);
    process.env.EVERFLOW_SINGLE_CHECKOUT_URL = mockEnvironment(uri).EVERFLOW_SINGLE_CHECKOUT_URL;
    // Client amount injection cannot change authoritative cents.
    const injected = await submit({ ...payload(single(5, "XL")), totalCents: 1, currency: "USD" });
    assert.equal(injected.status, 201); assert.equal(injected.data.order.totalCents, 1999);
    const beforeInvalid = await Order.countDocuments();
    await Settings.updateOne({ key: "store" }, { $set: { "data.shipping.priceCents": 490 } });
    assert.equal((await submit(payload())).status, 409);
    await Settings.updateOne({ key: "store" }, { $set: { "data.shipping.priceCents": 0 } });
    await Product.updateOne({ _id: fixture.products[4].id }, { $set: { currency: "USD" } });
    assert.equal((await submit(payload(single(4)))).status, 409);
    await Product.updateOne({ _id: fixture.products[4].id }, { $set: { currency: "EUR", "images.0.kind": "placeholder" } });
    assert.equal((await submit(payload(single(4)))).status, 409);
    await Product.updateOne({ _id: fixture.products[4].id }, { $set: { "images.0.kind": "photo" } });
    assert.equal(await Order.countDocuments(), beforeInvalid);
    // Simulate a stock change after quote validation: partial reservation is rolled back.
    const firstBefore = await stock(0, "XXL");
    const raced = orderRequestSchema.parse(payload(bundle(0, "XXL", 2, "XXL")));
    await assert.rejects(() => createOrderRequest(raced, {}, { validate: async () => {
      await Product.updateOne({ _id: fixture.products[2].id }, { $set: { "sizes.$[s].stock": 0 } }, { arrayFilters: [{ "s.label": "XXL" }] });
    } }));
    assert.equal(await stock(0, "XXL"), firstBefore); assert.equal(await Order.countDocuments({ idempotencyKey: raced.idempotencyKey }), 0);
    // Concurrent distinct customers cannot oversell the last tracked unit.
    await Product.updateOne({ _id: fixture.products[5].id }, { $set: { "sizes.$[s].stock": 1 } }, { arrayFilters: [{ "s.label": "S" }] });
    const lastUnit = await Promise.all([submit(payload(single(5, "S"))), submit(payload(single(5, "S")))]);
    assert.deepEqual(lastUnit.map(r => r.status).sort(), [201, 409]); assert.equal(await stock(5, "S"), 0);
    await assert.rejects(() => applyPaymentEvent({ provider: "everflow", providerRef: attempt.providerRef, type: "succeeded", amountCents: 1999, currency: "EUR", raw: {} }));
    const unsigned = await webhook(request("/api/payments/webhook/everflow", { type: "succeeded", token }), { params: Promise.resolve({ provider: "everflow" }) });
    assert.equal(unsigned.status, 501); assert.equal((await Order.findById(order._id))!.paymentStatus, "pending");
    await assert.rejects(() => updatePaymentStatus(String(order._id), "paid", "QA-admin"));
    await updateOrderStatus(String(order._id), "cancelled", "QA-admin", "Local cancellation test");
    assert.equal((await resume(request("/api/payments/checkout", { token }))).status, 409);
    assert.equal(await stock(0, "M"), before - 1); // one other Green/M bundle remains reserved
    // Disabled integration deliberately uses original unpaid request flow on THIS isolated DB.
    process.env.EVERFLOW_ENABLED = "false";
    const beforeDisabledCheckout = await Order.countDocuments();
    const stockBeforeDisabledCheckout = await stock(0, "M");
    const disabledCheckout = await submit({ ...payload(), requireCheckout: true });
    assert.equal(disabledCheckout.status, 409);
    assert.equal(disabledCheckout.data.code, "hosted_checkout_unavailable");
    assert.equal(await Order.countDocuments(), beforeDisabledCheckout);
    assert.equal(await stock(0, "M"), stockBeforeDisabledCheckout);
    const fallback = await submit(payload()); assert.equal(fallback.status, 201); assert.equal(fallback.data.checkout, null);
    assert.equal(fallback.data.order.paymentStatus, "awaiting_payment_setup");
    assert.equal(await PaymentAttempt.countDocuments({ order: (await Order.findOne({ publicToken: fallback.data.order.token }))!._id }), 0);
    console.log("Verified 6 variant combinations, concurrent stock/idempotency, retries, cancellation, refusals, webhook 501 and disabled fallback.");
  } finally {
    assertTestUri(uri); await mongoose.connection.dropDatabase(); await mongoose.disconnect();
  }
});
