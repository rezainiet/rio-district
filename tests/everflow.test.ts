import { test } from "node:test";
import assert from "node:assert/strict";
import { approvedDestination, buildEverflowUrl, eligibleOffer, EVERFLOW_OFFERS, HostedCheckoutError, pixelValue, publicImage, readEverflowConfig, type PrefillOrder } from "../src/lib/payments/everflow";
import { checkoutCustomerSchema } from "../src/lib/validation";
import { validFbclid } from "../src/lib/fbclid";
import { validSccid } from "../src/lib/sccid";

export const mockEnv = {
  PAYMENT_PROVIDER: "everflow", EVERFLOW_ENABLED: "true", EVERFLOW_MODE: "mock", APP_ENV: "development",
  MONGODB_URI: "mongodb://127.0.0.1:27017/rio_everflow_test_unit",
  EVERFLOW_SINGLE_CHECKOUT_URL: EVERFLOW_OFFERS.single.url, EVERFLOW_BUNDLE_CHECKOUT_URL: EVERFLOW_OFFERS.bundle.url,
  EVERFLOW_PUBLIC_ASSET_BASE_URL: "https://riodistrict.store",
};
function fixture(bundle = false): PrefillOrder {
  const item = { name: "Veste Brésil Vert", color: "Vert", size: "M", image: "/products/reference/vert.webp" };
  const amount = bundle ? 2495 : 1999;
  return { currency: "EUR", shippingCents: 0, totalCents: amount,
    lines: [{ kind: bundle ? "bundle" : "single", quantity: 1, totalCents: amount, unitPriceCents: amount,
      items: bundle ? [item, { ...item, name: "Veste Brésil Noir", color: "Noir", size: "L" }] : [item] }],
    customer: { firstName: "Élodie-Anne", lastName: "D’Artagnan de Test", email: "fiction+qa@example.com", phone: "+33 6 00 00 00 00" },
    shipping: { address: "12 rue de l’Essai & du Test", address2: "Bât. A, étage 2 #3", postalCode: "75001", city: "Saint-Étienne", country: "FR" } };
}
test("exact single and bundle routing, complete encoding and minimum personal data", () => {
  const config = readEverflowConfig(mockEnv)!;
  for (const bundle of [false, true]) {
    const order = fixture(bundle);
    const url = new URL(buildEverflowUrl(order, config, "opaque-reference", false));
    assert.equal(url.origin + url.pathname, EVERFLOW_OFFERS[bundle ? "bundle" : "single"].url);
    for (const [key, expected] of Object.entries({ sub10: order.customer.firstName, adv3: order.customer.lastName,
      sub3: "75001", sub4: order.customer.email, sub6: order.shipping.city, sub7: `${order.shipping.address}, ${order.shipping.address2}`,
      sub8: order.customer.phone, adv2: "https://riodistrict.store/products/reference/vert.webp" })) assert.equal(url.searchParams.get(key), expected);
    assert.ok(url.searchParams.get("adv1")?.includes("Veste Brésil Vert"));
    if (bundle) assert.match(url.searchParams.get("adv1")!, /Vert, M.*Noir, L/);
    for (const key of ["sub1", "sub5", "source_id", "token", "orderId", "country", "notes"]) assert.equal(url.searchParams.has(key), false);
    assert.equal(url.searchParams.size, 9);
  }
});
test("live offer URLs carry the submitted customer fields and retain tracking parameters", () => {
  const config = readEverflowConfig({ ...mockEnv, EVERFLOW_MODE: "live", EVERFLOW_LIVE_APPROVED: "true",
    EVERFLOW_VARIANTS_APPROVED: "true", EVERFLOW_BUNDLE_METADATA_APPROVED: "true",
    EVERFLOW_BUNDLE_IMAGE_URL: "/products/reference/bundle.webp", EVERFLOW_SUB1_MODE: "provider",
    EVERFLOW_PROVIDER_CLICK_ID: "approved-click", EVERFLOW_SOURCE_ID: "approved-source" })!;
  for (const bundle of [false, true]) {
    const order = fixture(bundle);
    const url = new URL(buildEverflowUrl(order, config, "unused-reference", false));
    assert.equal(url.origin + url.pathname, EVERFLOW_OFFERS[bundle ? "bundle" : "single"].url);
    assert.deepEqual(Object.fromEntries(["sub10", "adv3", "sub3", "sub4", "sub6", "sub7", "sub8"]
      .map(key => [key, url.searchParams.get(key)])), {
      sub10: order.customer.firstName, adv3: order.customer.lastName, sub3: order.shipping.postalCode,
      sub4: order.customer.email, sub6: order.shipping.city,
      sub7: `${order.shipping.address}, ${order.shipping.address2}`, sub8: order.customer.phone,
    });
    assert.equal(url.searchParams.get("source_id"), "approved-source");
    assert.equal(url.searchParams.has("sub1"), false);
    assert.match(url.search, /sub4=fiction%2Bqa%40example\.com/);
    assert.match(url.search, /sub8=%2B33\+6/);
    assert.match(url.search, /sub7=.*%26/);
  }
});
test("fixed offers reject mixed carts, quantities, currency, shipping and wrong amounts", () => {
  for (const mutate of [
    (o: PrefillOrder) => { o.lines.push(o.lines[0]); }, (o: PrefillOrder) => { o.lines[0].quantity = 2; },
    (o: PrefillOrder) => { o.currency = "USD"; }, (o: PrefillOrder) => { o.shippingCents = 1; },
    (o: PrefillOrder) => { o.totalCents = 1998; }, (o: PrefillOrder) => { o.lines[0].items = []; },
    (o: PrefillOrder) => { o.lines[0].kind = "other"; }, (o: PrefillOrder) => { o.lines[0].unitPriceCents = 2000; },
  ]) { const o = fixture(); mutate(o); assert.throws(() => eligibleOffer(o)); }
  const o = fixture(true); o.lines[0].quantity = 2; assert.throws(() => eligibleOffer(o));
});
test("exact allowlist refuses open redirects, example URL, insecure and missing destinations", () => {
  for (const url of [undefined, "", "http://www.molipy8trk.com/2J23GL9/TTF23GH/", "https://www.molipy8trk.com/2J23GL9/TRPS2FT/",
    "https://evil.example/", EVERFLOW_OFFERS.single.url + "?next=https://evil.example", EVERFLOW_OFFERS.single.url + "#x",
    "https://www.molipy8trk.com.evil.example/2J23GL9/TTF23GH/", "https://user@www.molipy8trk.com/2J23GL9/TTF23GH/"]) assert.throws(() => approvedDestination(url, "single"));
});
test("legacy pixel settings never put sub5 on either checkout link", () => {
  assert.equal(pixelValue({}), null);
  for (const [platform, key, expected, label] of [
    ["facebook", "FACEBOOK", "1306059791382915", ""], ["tiktok", "TIKTOK", "_".repeat(3) + "123", ""],
    ["google", "GOOGLE", "_".repeat(6) + "123" + "_".repeat(3) + "label", "label"],
    ["snapchat", "SNAPCHAT", "_".repeat(21) + "25924406-58d9-4767-9b28-e91773f5ba30", ""],
  ]) {
    const id = platform === "facebook" ? "1306059791382915" : platform === "snapchat" ? "25924406-58d9-4767-9b28-e91773f5ba30" : "123";
    const env = { ...mockEnv, EVERFLOW_PIXEL_PLATFORM: platform, [`EVERFLOW_${key}_PIXEL_ID`]: id, EVERFLOW_GOOGLE_PIXEL_LABEL: label, EVERFLOW_PIXEL_APPROVED: "true" };
    assert.equal(pixelValue(env), expected);
    const config = readEverflowConfig(env)!;
    assert.equal(new URL(buildEverflowUrl(fixture(), config, "reference", false)).searchParams.has("sub5"), false);
    for (const bundle of [false, true]) {
      assert.equal(new URL(buildEverflowUrl(fixture(bundle), config, "reference", true)).searchParams.has("sub5"), false);
    }
  }
  for (const env of [{ EVERFLOW_PIXEL_PLATFORM: "google", EVERFLOW_GOOGLE_PIXEL_ID: "123" }, { EVERFLOW_TIKTOK_PIXEL_ID: "123" },
    { EVERFLOW_PIXEL_PLATFORM: "tiktok", EVERFLOW_TIKTOK_PIXEL_ID: "123", EVERFLOW_FACEBOOK_PIXEL_ID: "456" }, { EVERFLOW_PIXEL_PLATFORM: "facebook" }]) assert.throws(() => pixelValue(env));
});
test("legacy combined Meta and Snapchat pixel setting cannot activate sub5", () => {
  const meta = "1306059791382915";
  const snap = "25924406-58d9-4767-9b28-e91773f5ba30";
  const env = { ...mockEnv, EVERFLOW_MODE: "live", EVERFLOW_LIVE_APPROVED: "true", EVERFLOW_VARIANTS_APPROVED: "true",
    EVERFLOW_BUNDLE_METADATA_APPROVED: "true", EVERFLOW_BUNDLE_IMAGE_URL: "/products/reference/bundle-six-colors.webp",
    EVERFLOW_PIXEL_PLATFORM: "facebook,snapchat", EVERFLOW_FACEBOOK_PIXEL_ID: meta, EVERFLOW_SNAPCHAT_PIXEL_ID: snap,
    EVERFLOW_PIXEL_APPROVED: "true" };
  const expected = meta + "_".repeat(21) + snap;
  assert.equal(pixelValue(env), expected);
  assert.equal(pixelValue({ ...env, EVERFLOW_PIXEL_PLATFORM: "snapchat,facebook" }), expected);
  const config = readEverflowConfig(env)!;
  for (const bundle of [false, true]) {
    const order = fixture(bundle);
    const withoutConsent = new URL(buildEverflowUrl(order, config, "reference", false));
    const withConsent = new URL(buildEverflowUrl(order, config, "reference", true));
    assert.equal(withoutConsent.searchParams.has("sub5"), false);
    assert.equal(withConsent.searchParams.has("sub5"), false);
    assert.equal(withConsent.origin + withConsent.pathname, EVERFLOW_OFFERS[bundle ? "bundle" : "single"].url);
    for (const field of ["sub10", "adv3", "sub3", "sub4", "sub6", "sub7", "sub8", "adv1", "adv2"])
      assert.equal(withConsent.searchParams.get(field), withoutConsent.searchParams.get(field));
  }
  for (const patch of [{ EVERFLOW_FACEBOOK_PIXEL_ID: "EAAC-token" }, { EVERFLOW_SNAPCHAT_PIXEL_ID: "bad" },
    { EVERFLOW_GOOGLE_PIXEL_ID: "123" }, { EVERFLOW_PIXEL_PLATFORM: "facebook,facebook" }])
    assert.throws(() => pixelValue({ ...env, ...patch }));
  assert.throws(() => readEverflowConfig({ ...env, EVERFLOW_PIXEL_APPROVED: "false" }));
});
test("legacy Meta pixel setting cannot activate sub5 on either offer", () => {
  const config = readEverflowConfig({ ...mockEnv, EVERFLOW_MODE: "live", EVERFLOW_LIVE_APPROVED: "true",
    EVERFLOW_VARIANTS_APPROVED: "true", EVERFLOW_BUNDLE_METADATA_APPROVED: "true",
    EVERFLOW_BUNDLE_IMAGE_URL: "/products/reference/bundle-six-colors.webp",
    EVERFLOW_PIXEL_PLATFORM: "facebook", EVERFLOW_FACEBOOK_PIXEL_ID: "1306059791382915",
    EVERFLOW_PIXEL_APPROVED: "true" })!;
  for (const bundle of [false, true]) {
    const order = fixture(bundle);
    const withoutConsent = new URL(buildEverflowUrl(order, config, "reference", false));
    const withConsent = new URL(buildEverflowUrl(order, config, "reference", true));
    assert.equal(withConsent.origin + withConsent.pathname, EVERFLOW_OFFERS[bundle ? "bundle" : "single"].url);
    assert.equal(withoutConsent.searchParams.has("sub5"), false);
    assert.equal(withConsent.searchParams.has("sub5"), false);
  }
});
test("a consented Meta click ID fills both sub1 and fbclid without static IDs", () => {
  const fbclid = "PAZXh0bgNhZW0CMTEAAa_sample-123";
  const config = readEverflowConfig({ ...mockEnv, EVERFLOW_MODE: "live", EVERFLOW_LIVE_APPROVED: "true",
    EVERFLOW_VARIANTS_APPROVED: "true", EVERFLOW_BUNDLE_METADATA_APPROVED: "true",
    EVERFLOW_BUNDLE_IMAGE_URL: "/products/reference/bundle-six-colors.webp",
    EVERFLOW_PIXEL_PLATFORM: "facebook", EVERFLOW_FACEBOOK_PIXEL_ID: "1306059791382915", EVERFLOW_PIXEL_APPROVED: "true",
    EVERFLOW_SUB1_MODE: "provider", EVERFLOW_PROVIDER_CLICK_ID: "provider-click", EVERFLOW_SOURCE_ID: "rio-source" })!;
  for (const bundle of [false, true]) {
    const order = { ...fixture(bundle), attribution: { fbclid } };
    const withConsent = new URL(buildEverflowUrl(order, config, "reference", true));
    const withoutConsent = new URL(buildEverflowUrl(order, config, "reference", false));
    assert.equal(withConsent.origin + withConsent.pathname, EVERFLOW_OFFERS[bundle ? "bundle" : "single"].url);
    assert.equal(withConsent.searchParams.get("fbclid"), fbclid);
    assert.equal(withConsent.searchParams.get("sub1"), fbclid);
    assert.equal(withConsent.searchParams.get("source_id"), "rio-source");
    assert.equal(withConsent.searchParams.has("sub5"), false);
    assert.equal(withoutConsent.searchParams.has("fbclid"), false);
    assert.equal(withoutConsent.searchParams.has("sub1"), false);
    assert.equal(withoutConsent.searchParams.has("sub5"), false);
  }
  assert.equal(validFbclid(fbclid), true);
  assert.equal(validFbclid("invalid@value"), false);
});
test("a consented Snapchat click ID fills sub1 and ScCid unless a Meta click ID is present", () => {
  const fbclid = "PAZXh0bgNhZW0CMTEAAa_sample-123";
  const sccid = "a1b2c3d4-e5f6-4a7b-8c9d-sample_ScCid";
  const config = readEverflowConfig({ ...mockEnv, EVERFLOW_MODE: "live", EVERFLOW_LIVE_APPROVED: "true",
    EVERFLOW_VARIANTS_APPROVED: "true", EVERFLOW_BUNDLE_METADATA_APPROVED: "true",
    EVERFLOW_BUNDLE_IMAGE_URL: "/products/reference/bundle-six-colors.webp", EVERFLOW_SOURCE_ID: "rio-source" })!;
  for (const bundle of [false, true]) {
    const order = { ...fixture(bundle), attribution: { sccid } };
    const withConsent = new URL(buildEverflowUrl(order, config, "reference", true));
    const withoutConsent = new URL(buildEverflowUrl(order, config, "reference", false));
    assert.equal(withConsent.origin + withConsent.pathname, EVERFLOW_OFFERS[bundle ? "bundle" : "single"].url);
    assert.equal(withConsent.searchParams.get("sub1"), sccid);
    assert.equal(withConsent.searchParams.get("ScCid"), sccid);
    assert.equal(withConsent.searchParams.has("fbclid"), false);
    assert.equal(withConsent.searchParams.get("source_id"), "rio-source");
    assert.equal(withConsent.searchParams.has("sub5"), false);
    for (const key of ["sub1", "ScCid", "fbclid", "sub5"]) assert.equal(withoutConsent.searchParams.has(key), false);
    const both = new URL(buildEverflowUrl({ ...order, attribution: { fbclid, sccid } }, config, "reference", true));
    assert.equal(both.searchParams.get("sub1"), fbclid);
    assert.equal(both.searchParams.get("fbclid"), fbclid);
    assert.equal(both.searchParams.get("ScCid"), sccid);
  }
  assert.throws(() => buildEverflowUrl({ ...fixture(), attribution: { sccid: "invalid@value" } }, config, "reference", true), HostedCheckoutError);
  assert.equal(validSccid(sccid), true);
  assert.equal(validSccid("invalid@value"), false);
  assert.equal(validSccid("x".repeat(501)), false);
});
test("disabled fallback, isolated mock guard, live approval and unapproved correlation", () => {
  assert.equal(readEverflowConfig({ ...mockEnv, EVERFLOW_ENABLED: "false" }), null);
  assert.equal(readEverflowConfig({ ...mockEnv, PAYMENT_PROVIDER: "", EVERFLOW_ENABLED: "false" }), null);
  assert.throws(() => readEverflowConfig({ ...mockEnv, PAYMENT_PROVIDER: "" }));
  for (const patch of [{ EVERFLOW_MODE: "" }, { MONGODB_URI: "mongodb://127.0.0.1:27017/kalt" }, { APP_ENV: "production" },
    { EVERFLOW_MODE: "live" }, { EVERFLOW_SINGLE_CHECKOUT_URL: "" }, { EVERFLOW_SUB1_MODE: "correlation" }, { EVERFLOW_SUB1_MODE: "disabled", EVERFLOW_PROVIDER_CLICK_ID: "issued" }]) assert.throws(() => readEverflowConfig({ ...mockEnv, ...patch }));
  const config = readEverflowConfig({ ...mockEnv, EVERFLOW_SUB1_MODE: "provider", EVERFLOW_PROVIDER_CLICK_ID: "issued-click", EVERFLOW_SOURCE_ID: "provided-affiliate" })!;
  const url = new URL(buildEverflowUrl(fixture(), config, "our-reference", false));
  assert.equal(url.searchParams.has("sub1"), false); assert.equal(url.searchParams.get("source_id"), "provided-affiliate");
  const approved = readEverflowConfig({ ...mockEnv, EVERFLOW_SUB1_MODE: "correlation", EVERFLOW_SUB1_CORRELATION_APPROVED: "true" })!;
  assert.equal(new URL(buildEverflowUrl(fixture(), approved, "opaque-reference", false)).searchParams.has("sub1"), false);
});
test("images, country and name prerequisites; live bundle requires explicit metadata contract", () => {
  for (const [image, base] of [["/x.webp", "http://localhost:3000"], ["/x.webp", "https://127.0.0.1"], ["//evil.example/x.webp", "https://riodistrict.store"], ["/x.svg", "https://riodistrict.store"], ["https://evil.example/x.webp", "https://riodistrict.store"], ["/x.webp?secret=1", "https://riodistrict.store"]]) assert.throws(() => publicImage(image, base));
  const config = readEverflowConfig(mockEnv)!;
  const o = fixture(); o.customer.firstName = undefined; assert.throws(() => buildEverflowUrl(o, config, "ref", false));
  const foreign = fixture(); foreign.shipping.country = "CH"; assert.throws(() => buildEverflowUrl(foreign, config, "ref", false));
  const live = readEverflowConfig({ ...mockEnv, EVERFLOW_MODE: "live", EVERFLOW_LIVE_APPROVED: "true", EVERFLOW_VARIANTS_APPROVED: "true" })!;
  assert.throws(() => buildEverflowUrl(fixture(true), live, "ref", false));
});
test("separate names retain multi-word surnames, older fullName is preserved without guessing", () => {
  const o = fixture();
  const customer = { ...o.customer, ...o.shipping, country: "FR" };
  assert.equal(checkoutCustomerSchema.parse(customer).fullName, "Élodie-Anne D’Artagnan de Test");
  const legacy = { ...customer, firstName: undefined, lastName: undefined, fullName: "Test de la Famille" };
  const parsed = checkoutCustomerSchema.parse(legacy);
  assert.equal(parsed.fullName, legacy.fullName); assert.equal(parsed.firstName, undefined);
  assert.equal(checkoutCustomerSchema.safeParse({ ...customer, lastName: "" }).success, false);
});
