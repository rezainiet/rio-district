import { test } from "node:test";
import assert from "node:assert/strict";
import { visitorPhoneCountry } from "../src/lib/visitor-country";
import { formatPhoneInput, normalizedPhone, phoneDialCode, phonePlaceholder } from "../src/lib/phone";
import { checkoutCustomerSchema } from "../src/lib/validation";
import { buildEverflowUrl, EVERFLOW_OFFERS, readEverflowConfig } from "../src/lib/payments/everflow";
import type { CountryCode } from "libphonenumber-js";

const mockEnv = { PAYMENT_PROVIDER: "everflow", EVERFLOW_ENABLED: "true", EVERFLOW_MODE: "mock", APP_ENV: "development",
  MONGODB_URI: "mongodb://127.0.0.1:27017/rio_everflow_test_phone",
  EVERFLOW_SINGLE_CHECKOUT_URL: EVERFLOW_OFFERS.single.url, EVERFLOW_BUNDLE_CHECKOUT_URL: EVERFLOW_OFFERS.bundle.url,
  EVERFLOW_PUBLIC_ASSET_BASE_URL: "https://riodistrict.store" };

test("visitor IP maps to French, Swiss and German dial codes; unknown IP falls back to France", async () => {
  const lookup = async (url: string | URL | Request) => {
    const ip = String(url).split("/").at(-1)!.split("?")[0];
    const country_code = ({ "198.51.100.11": "FR", "198.51.100.12": "CH", "198.51.100.13": "DE" } as Record<string, string>)[ip];
    return Response.json(country_code ? { success: true, country_code } : { success: false });
  };
  for (const [ip, expected, dial] of [["198.51.100.11", "FR", "+33"], ["198.51.100.12", "CH", "+41"], ["198.51.100.13", "DE", "+49"]]) {
    const country = await visitorPhoneCountry(ip, lookup as typeof fetch);
    assert.equal(country, expected);
    assert.equal(phoneDialCode(country as CountryCode), dial);
    assert.ok(phonePlaceholder(country as CountryCode).length > 5);
  }
  assert.equal(await visitorPhoneCountry("unknown", lookup as typeof fetch), "FR");
  assert.equal(await visitorPhoneCountry("198.51.100.14", lookup as typeof fetch), "FR");
});

test("checkout validates and normalizes selected country's number without changing delivery country", () => {
  const base = { firstName: "Camille", lastName: "Essai", email: "fiction@example.com", address: "12 rue du Test",
    postalCode: "75001", city: "Paris", country: "FR" };
  for (const [phoneCountry, phone, expected] of [["FR", "06 12 34 56 78", "+33612345678"],
    ["CH", "079 123 45 67", "+41791234567"], ["DE", "01512 3456789", "+4915123456789"]]) {
    const parsed = checkoutCustomerSchema.parse({ ...base, phoneCountry, phone });
    assert.equal(parsed.phoneCountry, phoneCountry);
    assert.equal(parsed.phoneE164, expected);
    assert.equal(parsed.country, "FR");
    assert.equal(normalizedPhone(phone, phoneCountry as "FR" | "CH" | "DE"), expected);
    assert.ok(formatPhoneInput(phone.replaceAll(" ", ""), phoneCountry as "FR" | "CH" | "DE").length >= phone.length - 2);
  }
  assert.equal(checkoutCustomerSchema.safeParse({ ...base, phoneCountry: "CH", phone: "123" }).success, false);
  assert.equal(checkoutCustomerSchema.safeParse({ ...base, phoneCountry: "ZZ", phone: "079 123 45 67" }).success, false);
});

test("both Everflow offers send E.164 to sub8 and retain their configured URLs", () => {
  const config = readEverflowConfig(mockEnv)!;
  for (const [kind, amount, url] of [["single", 1999, config.single], ["bundle", 2495, config.bundle]] as const) {
    const item = { name: "Veste Test", color: "Noir", size: "M", image: "/validation.webp" };
    const result = new URL(buildEverflowUrl({ currency: "EUR", shippingCents: 0, totalCents: amount,
      lines: [{ kind, quantity: 1, totalCents: amount, unitPriceCents: amount, items: kind === "bundle" ? [item, item] : [item] }],
      customer: { firstName: "Camille", lastName: "Essai", email: "fiction@example.com", phone: "079 123 45 67", phoneE164: "+41791234567" },
      shipping: { address: "12 rue du Test", city: "Paris", postalCode: "75001", country: "FR" } }, config, "test", false));
    assert.equal(result.origin + result.pathname, url);
    assert.equal(result.searchParams.get("sub8"), "+41791234567");
  }
});
