import { test } from "node:test";
import assert from "node:assert/strict";
import { priceCart, stockRequirements } from "../src/lib/pricing";
import { recommendSize } from "../src/lib/sizes";
import type { PublicProduct } from "../src/lib/types";

const sizes = ["XS", "S", "M", "L", "XL", "XXL", "3XL"].map((label) => ({
  label: label as PublicProduct["sizes"][number]["label"],
  available: true,
  remaining: null,
}));

function product(id: string, color: string, priceCents = 1999, extra: Partial<PublicProduct> = {}): PublicProduct {
  return {
    id,
    slug: `veste-bresil-${color}`,
    name: `Veste Brésil ${color}`,
    group: "veste-bresil",
    color: { name: color, hex: "#000000" },
    tagline: "",
    description: "",
    details: [],
    material: "",
    care: "",
    priceCents,
    compareAtCents: null,
    images: [],
    sizes,
    bundleEligible: true,
    ...extra,
  };
}

const vert = product("a".repeat(24), "Vert");
const rose = product("b".repeat(24), "Rose");
const map = new Map([vert, rose].map((p) => [p.id, p]));
const bundle = { enabled: true, quantity: 2, priceCents: 2495, label: "Pack 2 vestes" };

test("single jacket costs 19,99 €", () => {
  const q = priceCart([{ kind: "single", productId: vert.id, size: "M", quantity: 1 }], map, bundle, 0);
  assert.equal(q.totalCents, 1999);
  assert.equal(q.discountCents, 0);
  assert.equal(q.itemsCount, 1);
});

test("mixed-colour bundle costs 24,95 € and saves 15,03 €", () => {
  const q = priceCart(
    [{ kind: "bundle", items: [{ productId: vert.id, size: "M" }, { productId: rose.id, size: "XL" }], quantity: 1 }],
    map,
    bundle,
    0,
  );
  assert.equal(q.subtotalCents, 3998);
  assert.equal(q.discountCents, 1503);
  assert.equal(q.totalCents, 2495);
  assert.equal(q.itemsCount, 2);
  assert.deepEqual(q.lines[0].items.map((i) => `${i.color}:${i.size}`), ["Vert:M", "Rose:XL"]);
});

test("quantities multiply and shipping is added once", () => {
  const q = priceCart(
    [
      { kind: "bundle", items: [{ productId: vert.id, size: "S" }, { productId: vert.id, size: "S" }], quantity: 2 },
      { kind: "single", productId: rose.id, size: "L", quantity: 3 },
    ],
    map,
    bundle,
    490,
  );
  assert.equal(q.totalCents, 2495 * 2 + 1999 * 3 + 490);
  assert.equal(q.itemsCount, 7);
});

test("bundle never costs more than the items separately", () => {
  const cheap = product("c".repeat(24), "Promo", 1000);
  const q = priceCart(
    [{ kind: "bundle", items: [{ productId: cheap.id, size: "M" }, { productId: cheap.id, size: "L" }], quantity: 1 }],
    new Map([[cheap.id, cheap]]),
    bundle,
    0,
  );
  assert.equal(q.totalCents, 2000);
  assert.equal(q.discountCents, 0);
});

test("invalid lines are reported, not priced", () => {
  const soldOut = product("d".repeat(24), "Noir", 1999, {
    sizes: sizes.map((s) => (s.label === "M" ? { ...s, available: false } : s)),
  });
  const notEligible = product("e".repeat(24), "Bleu", 1999, { bundleEligible: false });
  const m = new Map([soldOut, notEligible, vert].map((p) => [p.id, p]));
  const q = priceCart(
    [
      { kind: "single", productId: soldOut.id, size: "M", quantity: 1 },
      { kind: "single", productId: "f".repeat(24), size: "M", quantity: 1 },
      { kind: "bundle", items: [{ productId: vert.id, size: "M" }, { productId: notEligible.id, size: "M" }], quantity: 1 },
      { kind: "bundle", items: [{ productId: vert.id, size: "M" }], quantity: 1 },
      { kind: "single", productId: vert.id, size: "M", quantity: 11 },
    ],
    m,
    bundle,
    0,
  );
  assert.equal(q.lines.length, 0);
  assert.equal(q.errors.length, 5);
  assert.equal(q.totalCents, 0);
});

test("disabled bundle offer is refused", () => {
  const q = priceCart(
    [{ kind: "bundle", items: [{ productId: vert.id, size: "M" }, { productId: rose.id, size: "M" }], quantity: 1 }],
    map,
    { ...bundle, enabled: false },
    0,
  );
  assert.equal(q.errors[0]?.message, "L'offre pack n'est plus disponible.");
});

test("stock requirements aggregate identical product/size", () => {
  const q = priceCart(
    [
      { kind: "bundle", items: [{ productId: vert.id, size: "M" }, { productId: vert.id, size: "M" }], quantity: 2 },
      { kind: "single", productId: vert.id, size: "M", quantity: 1 },
    ],
    map,
    bundle,
    0,
  );
  assert.deepEqual(stockRequirements(q.lines), [{ productId: vert.id, size: "M", qty: 5 }]);
});

test("size recommender matches every answer observed on the reference simulator", () => {
  const observed: [number, number, string][] = [
    [155, 45, "XS"], [160, 55, "S"], [170, 60, "S"], [175, 70, "M"], [178, 75, "L"], [180, 80, "L"],
    [185, 90, "XL"], [190, 100, "3XL"], [175, 110, "XXL"], [165, 85, "L"], [195, 120, "3XL"],
  ];
  for (const [h, w, expected] of observed) assert.equal(recommendSize(h, w), expected, `${h} cm / ${w} kg`);
  assert.equal(recommendSize(100, 70), null);
});
