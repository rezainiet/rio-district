/** Runs only against dev:everflow; fictional inputs, no external tracking navigation. */
import { readFile, mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { chromium } from "playwright-core";
import { assertTestUri } from "./lib/everflow-fixture";
import { Order } from "../src/models/Order";
import { PaymentAttempt } from "../src/models/misc";

async function main() {
  const fixture = JSON.parse(await readFile(".data/everflow-preview.json", "utf8"));
  assertTestUri(fixture.uri); await mongoose.connect(fixture.uri);
  const base = "http://localhost:3001";
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  // Next dev compiles cold routes on demand; do not wait for unrelated remote media.
  const results: string[] = [];
  const errors: string[] = [];
  let trackingRequests = 0;
  await mkdir(".data/everflow-qa", { recursive: true });
  try {
    for (const width of [390, 1440]) {
      console.log(`${width}px: starting storefront flow`);
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      if (width === 390) await context.addInitScript(() => {
        const get = Storage.prototype.getItem;
        const set = Storage.prototype.setItem;
        Storage.prototype.getItem = function(key: string) { if (key.startsWith("rd.checkout.")) throw new Error("QA: checkout storage unavailable"); return get.call(this, key); };
        Storage.prototype.setItem = function(key: string, value: string) { if (key.startsWith("rd.checkout.")) throw new Error("QA: checkout storage unavailable"); return set.call(this, key, value); };
      });
      await context.route("**/*", async route => {
        if (new URL(route.request().url()).hostname.includes("molipy8trk")) { trackingRequests++; await route.abort(); }
        else await route.continue();
      });
      const page = await context.newPage();
      page.setDefaultNavigationTimeout(90_000);
      page.on("pageerror", error => errors.push(error.message));
      await page.goto(`${base}/produit/veste-bresil-vert`, { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => localStorage.getItem("rd.cart.v1") !== null);
      console.log(`${width}px: product hydrated`);
      if (width === 1440) {
        await page.getByText("Le duo · 2 vestes", { exact: true }).click();
        assert.equal(await page.getByRole("radio", { name: "Pack 2 vestes", exact: true }).isChecked(), true);
        await page.getByRole("combobox", { name: "Taille de la veste 1 — Vert", exact: true }).selectOption("M");
        await page.locator("#field-slot1").getByRole("radio", { name: "Noir", exact: true }).click();
        await page.getByRole("combobox", { name: "Taille de la veste 2 — Noir", exact: true }).selectOption("L");
        await page.getByRole("button", { name: /Ajouter le pack/ }).first().click();
      } else {
        await page.getByRole("combobox", { name: "Taille — Veste Brésil Vert", exact: true }).selectOption("M");
        await page.getByRole("button", { name: /Ajouter au panier/ }).first().click();
      }
      await page.screenshot({ path: `.data/everflow-qa/cart-${width}.png` });
      console.log(`${width}px: cart opened`);
      await page.getByRole("link", { name: /Commander ·/ }).click();
      await page.waitForURL(`${base}/commande`);
      console.log(`${width}px: checkout loaded`);
      await page.getByLabel("Prénom", { exact: true }).fill("Élodie-Anne");
      await page.getByLabel("Nom", { exact: true }).fill("de la Fiction");
      await page.getByLabel("E-mail", { exact: true }).fill("fiction+browser@example.com");
      await page.getByLabel("Téléphone", { exact: true }).fill("+33 6 00 00 00 00");
      await page.getByLabel("Adresse", { exact: true }).fill("12 rue de la Fiction");
      await page.getByLabel("Code postal", { exact: true }).fill("75001");
      await page.getByLabel("Ville", { exact: true }).fill("Paris");
      assert.ok(await page.getByText("Simulation locale · aucun paiement réel.", { exact: true }).isVisible());
      assert.ok(await page.getByRole("button", { name: /Continuer vers le paiement/ }).isEnabled());
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      await page.screenshot({ path: `.data/everflow-qa/checkout-${width}.png`, fullPage: true });
      const before = await Order.countDocuments();
      if (width === 390) {
        // Response is lost AFTER the real API commits: retry must not create another order.
        await page.route("**/api/orders", async route => { await route.fetch(); await route.abort("failed"); }, { times: 1 });
        await page.getByRole("button", { name: /Continuer vers le paiement/ }).click();
        await page.getByRole("alert").filter({ hasText: /Connexion impossible/ }).waitFor();
        assert.equal(await Order.countDocuments(), before + 1);
      }
      // Check loading/double-click protection while the server response is delayed.
      await page.route("**/api/orders", async route => { const response = await route.fetch(); await new Promise(resolve => setTimeout(resolve, 500)); await route.fulfill({ response }); }, { times: 1 });
      await page.getByRole("button", { name: /Continuer vers le paiement/ }).click();
      await page.getByRole("button", { name: "Préparation du paiement…" }).waitFor();
      assert.equal(await page.getByRole("button", { name: "Préparation du paiement…" }).isDisabled(), true);
      await page.waitForURL(/\/commande\/paiement-test\//);
      const token = page.url().split("/").pop()!;
      const order = await Order.findOne({ publicToken: token }).lean(); assert.ok(order);
      assert.equal(await Order.countDocuments(), before + 1); assert.equal(order.paymentStatus, "pending");
      assert.equal(await PaymentAttempt.countDocuments({ order: order._id }), 1);
      assert.equal(order.lines[0].items[0].size, "M");
      assert.equal(order.totalCents, width === 1440 ? 2495 : 1999);
      if (width === 1440) { assert.equal(order.lines[0].items[1].color, "Noir"); assert.equal(order.lines[0].items[1].size, "L"); }
      await page.getByRole("link", { name: "Retour au panier", exact: true }).click();
      await page.getByRole("heading", { name: "Ton panier", exact: true }).waitFor();
      assert.ok(await page.getByRole("link", { name: /Commander ·/ }).isVisible());
      await page.goto(`${base}/commande/confirmation/${token}`);
      assert.ok(await page.getByText("En attente — paiement non vérifié", { exact: true }).isVisible());
      assert.equal(await page.getByText("Non payée — aucun montant prélevé", { exact: true }).count(), 0);
      await page.getByRole("button", { name: "Reprendre le paiement ↗", exact: true }).click();
      await page.waitForURL(/\/commande\/paiement-test\//);
      assert.equal(await Order.countDocuments(), before + 1);
      await context.addCookies([{ name: "rd_admin", value: fixture.adminToken, url: base, httpOnly: true, sameSite: "Lax" }]);
      await page.goto(`${base}/admin/commandes/${order._id}`);
      await page.getByText("Checkout Everflow", { exact: true }).waitFor();
      assert.ok(await page.getByText("Simulation locale — aucun paiement réel", { exact: true }).isVisible());
      assert.ok(await page.getByText("Veste Brésil Vert", { exact: true }).first().isVisible());
      if (width === 1440) assert.ok(await page.getByText("Veste Brésil Noir", { exact: true }).first().isVisible());
      results.push(`${width}px: ${width === 1440 ? "Green/M + Black/L bundle" : "Green/M single"} → cart → form → local redirect; retained cart, loading, pending recovery and admin visibility passed${width === 390 ? "; lost-response retry reused order even with checkout session storage blocked" : ""}.`);
      await context.close();
    }
    // Unsupported quantity remains visible, and cannot be redirected.
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.addInitScript(id => localStorage.setItem("rd.cart.v1", JSON.stringify([{ key: "qa-incompatible", kind: "single", productId: id, size: "M", quantity: 2 }])), fixture.products[0].id);
    const page = await context.newPage(); await page.goto(`${base}/commande`);
    await page.getByRole("alert").filter({ hasText: /Ce paiement accepte/ }).waitFor();
    assert.equal(await page.getByRole("button", { name: /Continuer vers le paiement/ }).isDisabled(), true);
    results.push("Unsupported quantity: explanatory error, disabled payment CTA, no cart items discarded.");
    await context.close();
    assert.equal(trackingRequests, 0); assert.deepEqual(errors, []);
    await writeFile(".data/everflow-qa/results.json", JSON.stringify({ results, trackingRequests, errors }, null, 2));
    results.forEach(result => console.log(result)); console.log("No tracking-domain requests; no browser runtime errors.");
  } finally { await browser.close(); await mongoose.disconnect(); }
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Browser QA failed"); process.exit(1); });
