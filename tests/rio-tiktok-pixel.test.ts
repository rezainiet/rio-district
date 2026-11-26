import { test } from "node:test";
import assert from "node:assert/strict";
import { isRioTikTokStorefrontRoute, loadRioTikTokPixel, RIO_TIKTOK_PIXEL_ID } from "../src/lib/rio-tiktok-pixel";
import { resolvePublicPath } from "../src/i18n/config";

test("TikTok is eligible on public catalog routes, never on checkout and tokenized paths", () => {
  for (const path of ["/", "/fr", "/carrito", "/panier", "/producto/green", "/produit/green"]) {
    assert.equal(isRioTikTokStorefrontRoute(resolvePublicPath(path).path), true, path);
  }
  for (const path of ["/commande", "/pedido", "/pedido/confirmacion/example", "/commande/confirmation/example",
    "/commande/paiement-test/example", "/pedido/pago-prueba/example", "/admin", "/produit/green/private"]) {
    assert.equal(isRioTikTokStorefrontRoute(resolvePublicPath(path).path), false, path);
  }
});

test("the browser loader initializes once with Rio ID and queues PageView only", () => {
  const win = {} as Window & { ttq?: unknown };
  const scripts: HTMLScriptElement[] = [];
  const doc = {
    querySelector: () => null,
    createElement: () => ({}),
    head: { appendChild: (script: HTMLScriptElement) => scripts.push(script) },
  } as unknown as Document;
  loadRioTikTokPixel(win, doc);
  loadRioTikTokPixel(win, doc);
  assert.equal(scripts.length, 1);
  assert.equal(scripts[0].src, `https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=${RIO_TIKTOK_PIXEL_ID}&lib=ttq`);
  assert.deepEqual(Array.from(win.ttq as unknown[][]), [["page"]]);
  const preexisting = { ttq: ["external"] } as unknown as typeof win;
  loadRioTikTokPixel(preexisting, doc);
  assert.deepEqual(preexisting.ttq, ["external"]);
  assert.equal(scripts.length, 1);
});
