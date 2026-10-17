import { test } from "node:test";
import assert from "node:assert/strict";
import { parseDirectCheckout } from "../src/lib/direct-checkout";

test("direct checkout preserves the selected single or bundle without trusting prices", () => {
  const single = { kind: "single", productId: "a".repeat(24), size: "M", quantity: 1 };
  const bundle = { kind: "bundle", items: [{ productId: "a".repeat(24), size: "M" }, { productId: "b".repeat(24), size: "L" }], quantity: 1 };
  for (const selection of [single, bundle]) {
    const params = new URLSearchParams({ achat: JSON.stringify({ ...selection, totalCents: 1, redirectUrl: "https://example.com" }) });
    assert.deepEqual(parseDirectCheckout(params.get("achat")), selection);
  }
});

test("invalid direct selections cannot silently fall back to the basket", () => {
  const single = { kind: "single", productId: "a".repeat(24), size: "M", quantity: 1 };
  for (const value of [undefined, "", "{", "x".repeat(1001), [JSON.stringify(single)], JSON.stringify([single]),
    JSON.stringify({ ...single, quantity: 2 }), JSON.stringify({ ...single, size: "invalid" }),
    JSON.stringify({ ...single, productId: "invalid" }), JSON.stringify({ kind: "bundle", items: [], quantity: 1 })]) {
    assert.equal(parseDirectCheckout(value), null);
  }
});
