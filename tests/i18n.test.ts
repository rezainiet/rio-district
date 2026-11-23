import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { localizePath, resolvePublicPath, switchLocaleHref } from "../src/i18n/config";
import { ES, ES_AREAS } from "../src/i18n/es";
import { translate, translateText } from "../src/i18n/translate";
import { rangeLong, rangeShort, shortDay } from "../src/lib/delivery-plan";

/* ---------- Every t("…") in the storefront has a Spanish entry ---------- */

const SRC = path.join(__dirname, "..", "src");
// Internal tools stay French: admin, design-review and concept previews.
const SKIP = [/[\\/]admin[\\/]/, /[\\/]design-review[\\/]/, /[\\/]concepts[\\/]/, /[\\/]src[\\/]i18n[\\/]/];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return files(full);
    return /\.(tsx?|mts)$/.test(name) && !SKIP.some((re) => re.test(full)) ? [full] : [];
  });
}

/** String literals passed as the first argument of t(…). */
function tKeys(source: string): string[] {
  const keys: string[] = [];
  const re = /(?<![\w.$])t\(\s*(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|`((?:\\.|[^`\\])*)`)/g;
  for (const m of source.matchAll(re)) {
    const raw = m[1] ?? m[2] ?? m[3];
    if (m[3] !== undefined && raw.includes("${")) continue; // dynamic template literal: not a key
    keys.push(JSON.parse(`"${raw.replace(/\\'/g, "'").replace(/\\`/g, "`").replace(/(?<!\\)"/g, '\\"')}"`));
  }
  return keys;
}

test("every t() key used in the storefront has a Spanish translation", () => {
  const missing: string[] = [];
  for (const file of files(SRC)) {
    for (const key of tKeys(readFileSync(file, "utf8"))) {
      if (ES[key] === undefined) missing.push(`${path.relative(SRC, file)}: ${JSON.stringify(key)}`);
    }
  }
  assert.deepEqual(missing, [], `Missing Spanish entries:\n${missing.join("\n")}`);
});

test("placeholders match between French and Spanish", () => {
  const names = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
  const wrong = Object.entries(ES).filter(([fr, es]) => names(fr) !== names(es)).map(([fr]) => fr);
  assert.deepEqual(wrong, []);
});

test("no French key is translated differently in two areas", () => {
  const seen = new Map<string, { area: string; es: string }>();
  const conflicts: string[] = [];
  for (const [area, dict] of Object.entries(ES_AREAS)) {
    for (const [fr, es] of Object.entries(dict)) {
      const prev = seen.get(fr);
      if (prev && prev.es !== es) conflicts.push(`${JSON.stringify(fr)}: ${prev.area} vs ${area}`);
      seen.set(fr, { area, es });
    }
  }
  assert.deepEqual(conflicts, []);
});

test("Spanish entries are not left in French or empty", () => {
  const empty = Object.entries(ES).filter(([, es]) => !es.trim()).map(([fr]) => fr);
  assert.deepEqual(empty, []);
});

/* ---------- URLs ---------- */

test("Spanish is the default language", () => {
  assert.deepEqual(resolvePublicPath("/"), { locale: "es", path: "/" });
  assert.deepEqual(resolvePublicPath("/inconnu"), { locale: "es", path: "/inconnu" });
});

test("existing French page URLs keep working unchanged (ads, shared links, order confirmations)", () => {
  for (const href of ["/produit/veste-bresil-noir?offre=pack#acheter", "/panier", "/commande", "/commande/confirmation/abc", "/livraison-retours", "/retours-remboursements"]) {
    assert.equal(localizePath(href, "fr"), href);
    assert.deepEqual(resolvePublicPath(href.split(/[?#]/)[0]), { locale: "fr", path: href.split(/[?#]/)[0] });
  }
  // Only the French home page moved.
  assert.equal(localizePath("/", "fr"), "/fr");
  assert.equal(localizePath("/#collection", "fr"), "/fr#collection");
  assert.deepEqual(resolvePublicPath("/fr"), { locale: "fr", path: "/" });
});

test("internal paths map to Spanish URLs and back", () => {
  const cases: [string, string][] = [
    ["/", "/"],
    ["/#collection", "/#collection"],
    ["/produit/veste-bresil-noir?offre=pack#acheter", "/producto/veste-bresil-noir?offre=pack#acheter"],
    ["/panier", "/carrito"],
    ["/commande?ligne=1", "/pedido?ligne=1"],
    ["/commande/confirmation/abc", "/pedido/confirmacion/abc"],
    ["/commande/paiement-test/abc", "/pedido/pago-prueba/abc"],
    ["/livraison-retours", "/envios-devoluciones"],
    ["/retours-remboursements", "/devoluciones-reembolsos"],
  ];
  for (const [internal, publicUrl] of cases) {
    assert.equal(localizePath(internal, "es"), publicUrl);
    const pathOnly = publicUrl.split(/[?#]/)[0];
    assert.deepEqual(resolvePublicPath(pathOnly), { locale: "es", path: internal.split(/[?#]/)[0] });
  }
  // Not storefront pages: untouched in both languages.
  for (const href of ["/api/orders", "/uploads/a.webp", "/products/reference/x.webp", "/admin", "//cdn.test/x", "https://x.test/a"]) {
    assert.equal(localizePath(href, "es"), href);
    assert.equal(localizePath(href, "fr"), href);
  }
});

test("non-canonical URLs redirect to the canonical page", () => {
  assert.equal(resolvePublicPath("/fr/produit/x").redirect, "/produit/x");
  assert.equal(resolvePublicPath("/fr/panier").redirect, "/panier");
  assert.equal(resolvePublicPath("/fr/producto/x").redirect, "/produit/x");
  // Earlier preview URLs with an /es prefix.
  assert.equal(resolvePublicPath("/es").redirect, "/");
  assert.equal(resolvePublicPath("/es/producto/x").redirect, "/producto/x");
  assert.equal(resolvePublicPath("/es/carrito").redirect, "/carrito");
  // Canonical URLs never redirect.
  for (const p of ["/", "/fr", "/producto/x", "/produit/x", "/carrito", "/panier"]) assert.equal(resolvePublicPath(p).redirect, undefined, p);
});

test("the language switch keeps the visitor on the same page", () => {
  assert.equal(switchLocaleHref("/produit/veste-bresil-noir?offre=pack#acheter", "es"), "/producto/veste-bresil-noir?offre=pack#acheter");
  assert.equal(switchLocaleHref("/producto/veste-bresil-noir?offre=pack#acheter", "fr"), "/produit/veste-bresil-noir?offre=pack#acheter");
  assert.equal(switchLocaleHref("/", "fr"), "/fr");
  assert.equal(switchLocaleHref("/fr", "es"), "/");
  assert.equal(switchLocaleHref("/carrito", "fr"), "/panier");
  assert.equal(switchLocaleHref("/pedido/confirmacion/abc", "fr"), "/commande/confirmation/abc");
});

/* ---------- Translation ---------- */

test("t() keeps French, translates Spanish, and falls back to French", () => {
  assert.equal(translate("fr", "OFFRE DUO · {n} VESTES POUR {price} · COLORIS AU CHOIX", { n: 2, price: "24,95 €" }), "OFFRE DUO · 2 VESTES POUR 24,95 € · COLORIS AU CHOIX");
  assert.equal(translate("es", "OFFRE DUO · {n} VESTES POUR {price} · COLORIS AU CHOIX", { n: 2, price: "24,95 €" }), "OFERTA DÚO · 2 CHAQUETAS POR 24,95 € · COLORES A ELEGIR");
  assert.equal(translate("es", "Texte sans traduction"), "Texte sans traduction");
});

test("database text is translated by template, including captured values", () => {
  assert.equal(translateText("es", "Veste Brésil Noir"), "Chaqueta Brasil Negro");
  assert.equal(translateText("es", "Veste Brésil Jaune, vue de face sur mannequin"), "Chaqueta Brasil Amarillo, vista frontal en maniquí");
  assert.equal(translateText("es", "Veste Brésil Bleu — 19,99 €"), "Chaqueta Brasil Azul — 19,99 €");
  assert.equal(translateText("fr", "Veste Brésil Noir"), "Veste Brésil Noir");
  assert.equal(translateText("es", "Rio District"), "Rio District");
});

test("delivery dates read naturally in Spanish", () => {
  assert.equal(rangeLong("2026-10-20", "2026-10-22", "es"), "entre el 20 y el 22 de octubre");
  assert.equal(rangeLong("2026-10-30", "2026-11-02", "es"), "entre el 30 de octubre y el 2 de noviembre");
  assert.equal(rangeLong("2026-10-20", "2026-10-20", "es"), "el 20 de octubre");
  assert.equal(rangeShort("2026-10-20", "2026-10-22", "es"), "20 – 22 oct");
  assert.equal(shortDay("2026-10-19", "es"), "lun 19 oct");
  assert.equal(rangeLong("2026-10-20", "2026-10-22"), "entre le 20 et le 22 octobre");
});
