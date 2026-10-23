import { test } from "node:test";
import assert from "node:assert/strict";
import { consentedFbclid, rememberConsentedFbclid, trackCheckoutClick, trackCheckoutStart } from "../src/components/store/MarketingPixels";
import type { CartQuote } from "../src/lib/types";

test("checkout entry sends one consented Meta InitiateCheckout with the server cart, while redirect does not repeat it", () => {
  const calls: unknown[][] = [];
  const session = new Map<string, string>();
  let choice: "accepted" | "refused" = "refused";
  const originals = ["window", "localStorage", "sessionStorage"].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const);
  Object.defineProperty(globalThis, "window", { configurable: true, value: {
    snaptr: (...args: unknown[]) => calls.push(["snap", ...args]),
    fbq: (...args: unknown[]) => calls.push(["meta", ...args]),
  } });
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
    getItem: () => JSON.stringify({ choice, at: Date.now() }),
  } });
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: {
    getItem: (key: string) => session.get(key) ?? null,
    setItem: (key: string, value: string) => { session.set(key, value); },
    removeItem: (key: string) => { session.delete(key); },
  } });
  try {
    const item = (productId: string) => ({ productId, slug: productId, name: productId,
      color: productId, size: "M" as const, image: "", unitPriceCents: 1999 });
    const quote: CartQuote = {
      errors: [], itemsCount: 2, totalCents: 2495, subtotalCents: 3998,
      discountCents: 1503, shippingCents: 0,
      lines: [{ kind: "bundle", label: "Duo", quantity: 1, unitPriceCents: 2495,
        compareAtCents: 3998, totalCents: 2495, savingsCents: 1503,
        items: [item("green"), item("black")] }],
    };
    const clickId = "PAZXh0bgNhZW0CMTEAAa_sample-123";
    rememberConsentedFbclid(`?fbclid=${clickId}`);
    assert.equal(consentedFbclid(), null);
    assert.equal(trackCheckoutStart(quote, "bundle-1"), false);
    assert.equal(trackCheckoutClick(2495, "ORDER-1"), false);
    assert.equal(calls.length, 0);
    choice = "accepted";
    rememberConsentedFbclid(`?utm_source=meta&fbclid=${clickId}`);
    assert.equal(consentedFbclid(), clickId);
    rememberConsentedFbclid("?fbclid=invalid%40value");
    assert.equal(consentedFbclid(), clickId);
    assert.equal(trackCheckoutStart(quote, "bundle-1"), true);
    assert.deepEqual(calls, [["meta", "trackSingle", "1378153049835069", "InitiateCheckout", {
      content_ids: ["green", "black"], contents: [{ id: "green", quantity: 1 }, { id: "black", quantity: 1 }],
      content_type: "product", num_items: 2, value: 24.95, currency: "EUR",
    }]]);
    assert.equal(trackCheckoutStart(quote, "bundle-1"), false);
    assert.equal(trackCheckoutStart({ ...quote, errors: [{ index: 0, message: "Invalid" }] }, "invalid"), false);
    assert.equal(trackCheckoutClick(2495, "ORDER-1"), true);
    assert.deepEqual(calls, [
      ["meta", "trackSingle", "1378153049835069", "InitiateCheckout", {
        content_ids: ["green", "black"], contents: [{ id: "green", quantity: 1 }, { id: "black", quantity: 1 }],
        content_type: "product", num_items: 2, value: 24.95, currency: "EUR",
      }],
      ["snap", "track", "START_CHECKOUT", { price: "24.95", currency: "EUR" }],
    ]);
    assert.equal(trackCheckoutClick(2495, "ORDER-1"), false);
    assert.equal(trackCheckoutClick(1999, "ORDER-2"), true);
    assert.equal(calls.length, 3);
    assert.equal(calls.filter(call => call[3] === "InitiateCheckout").length, 1);
    assert.equal(trackCheckoutClick(0, "ORDER-3"), false);
  } finally {
    for (const [name, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    }
  }
});
