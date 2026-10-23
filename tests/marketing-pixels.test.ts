import { test } from "node:test";
import assert from "node:assert/strict";
import { consentedFbclid, rememberConsentedFbclid, trackCheckoutClick } from "../src/components/store/MarketingPixels";

test("hosted checkout click sends Meta InitiateCheckout once per consented order with the server amount", () => {
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
    const clickId = "PAZXh0bgNhZW0CMTEAAa_sample-123";
    rememberConsentedFbclid(`?fbclid=${clickId}`);
    assert.equal(consentedFbclid(), null);
    assert.equal(trackCheckoutClick(2495, "ORDER-1"), false);
    assert.equal(calls.length, 0);
    choice = "accepted";
    rememberConsentedFbclid(`?utm_source=meta&fbclid=${clickId}`);
    assert.equal(consentedFbclid(), clickId);
    rememberConsentedFbclid("?fbclid=invalid%40value");
    assert.equal(consentedFbclid(), clickId);
    assert.equal(trackCheckoutClick(2495, "ORDER-1"), true);
    assert.deepEqual(calls, [
      ["snap", "track", "START_CHECKOUT", { price: "24.95", currency: "EUR" }],
      ["meta", "trackSingle", "1378153049835069", "InitiateCheckout", { value: 24.95, currency: "EUR" }],
    ]);
    assert.equal(trackCheckoutClick(2495, "ORDER-1"), false);
    assert.equal(trackCheckoutClick(1999, "ORDER-2"), true);
    assert.equal(calls.length, 4);
    assert.equal(trackCheckoutClick(0, "ORDER-3"), false);
  } finally {
    for (const [name, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    }
  }
});
