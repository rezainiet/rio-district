/** Runs only against dev:everflow; fictional inputs, no external tracking navigation. */
import { readFile, mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { chromium } from "playwright-core";
import { assertTestUri, mockEnvironment } from "./lib/everflow-fixture";
import { buildEverflowUrl, readEverflowConfig } from "../src/lib/payments/everflow";
import { Order } from "../src/models/Order";
import { PaymentAttempt } from "../src/models/misc";

async function main() {
  const fixture = JSON.parse(await readFile(".data/everflow-preview.json", "utf8"));
  assertTestUri(fixture.uri); await mongoose.connect(fixture.uri);
  const base = process.env.RIO_EVERFLOW_QA_BASE_URL ?? "http://localhost:3001";
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  // Next dev compiles cold routes on demand; do not wait for unrelated remote media.
  const results: string[] = [];
  const errors: string[] = [];
  let trackingRequests = 0;
  const sampleFbclid = "PAZXh0bgNhZW0CMTEAAa_sample-123";
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
        const host = new URL(route.request().url()).hostname;
        if (host.includes("molipy8trk")) { trackingRequests++; await route.abort(); }
        else if (host === "connect.facebook.net" || host === "sc-static.net") await route.abort();
        else await route.continue();
      });
      const page = await context.newPage();
      page.setDefaultNavigationTimeout(90_000);
      page.on("pageerror", error => errors.push(error.message));
      await page.goto(`${base}/produit/veste-bresil-vert${width === 1440 ? `?fbclid=${sampleFbclid}` : ""}`, { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => localStorage.getItem("rd.cart.v1") !== null);
      await page.getByRole("region", { name: "Choix des cookies publicitaires" })
        .getByRole("button", { name: width === 1440 ? "Accepter" : "Refuser" }).click();
      if (width === 1440) {
        assert.equal(await page.evaluate(() => sessionStorage.getItem("rd.meta.fbclid")), sampleFbclid);
        const events = await page.evaluate(() => window.fbq?.queue?.map(args => args[2]) ?? []);
        assert.ok(events.includes("PageView")); assert.ok(events.includes("ViewContent"));
        assert.ok(!events.includes("Purchase") && !events.includes("InitiateCheckout"));
      }
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
      if (width === 1440) {
        const cartEvents = await page.evaluate(() => window.fbq?.queue?.filter(args => args[2] === "AddToCart") ?? []);
        assert.equal(cartEvents.length, 1);
        assert.equal((cartEvents[0][3] as { value: number }).value, 24.95);
      }
      await page.screenshot({ path: `.data/everflow-qa/cart-${width}.png` });
      console.log(`${width}px: cart opened`);
      await page.getByRole("link", { name: /Commander ·/ }).click();
      await page.waitForURL(`${base}/commande`);
      if (width === 1440) {
        assert.equal(await page.evaluate(() => sessionStorage.getItem("rd.meta.fbclid")), sampleFbclid);
        await page.waitForFunction(() => window.fbq?.queue?.some(args => args[2] === "InitiateCheckout"));
        const checkoutEvents = await page.evaluate(() => window.fbq?.queue?.filter(args => args[2] === "InitiateCheckout") ?? []);
        assert.equal(checkoutEvents.length, 1);
        assert.equal((checkoutEvents[0][3] as { value: number }).value, 24.95);
        assert.equal((checkoutEvents[0][3] as { num_items: number }).num_items, 2);
        await page.getByRole("checkbox", { name: /identifiant de clic Meta/ }).check();
      } else {
        assert.ok(!(await page.evaluate(() => window.fbq?.queue?.map(args => args[2]) ?? [])).includes("InitiateCheckout"));
      }
      console.log(`${width}px: checkout loaded`);
      await page.getByLabel("Prénom", { exact: true }).fill("Élodie-Anne");
      await page.getByLabel("Nom", { exact: true }).fill("de la Fiction");
      await page.getByLabel("E-mail", { exact: true }).fill("fiction+browser@example.com");
      await page.getByLabel("Téléphone", { exact: true }).fill("+33 6 00 00 00 00");
      await page.getByLabel("Adresse", { exact: true }).fill("12 rue de la Fiction");
      await page.getByLabel("Code postal", { exact: true }).fill("75001");
      await page.getByLabel("Ville", { exact: true }).fill("Paris");
      assert.ok(await page.getByText("Mode test · aucun débit possible", { exact: true }).isVisible());
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
      if (width === 1440) {
        assert.equal(order.attribution?.fbclid, sampleFbclid);
        const partnerUrl = new URL(buildEverflowUrl(order, readEverflowConfig(mockEnvironment(fixture.uri))!, "test-reference", true));
        assert.equal(partnerUrl.searchParams.get("sub1"), sampleFbclid);
        assert.equal(partnerUrl.searchParams.get("fbclid"), sampleFbclid);
        assert.equal(partnerUrl.searchParams.has("sub5"), false);
      }
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
      if (width === 1440) assert.ok(!(await page.evaluate(() => window.fbq?.queue?.map(args => args[2]) ?? [])).includes("Purchase"));
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
    // Consent accepted on checkout must send the start once, including after a reload.
    {
      const context = await browser.newContext();
      await context.addInitScript(id => localStorage.setItem("rd.cart.v1", JSON.stringify([
        { key: "qa-consent", kind: "single", productId: id, size: "M", quantity: 1 },
      ])), fixture.products[0].id);
      await context.route("**/*", async route => {
        const host = new URL(route.request().url()).hostname;
        if (host === "connect.facebook.net" || host === "sc-static.net") await route.abort();
        else await route.continue();
      });
      const page = await context.newPage();
      await page.goto(`${base}/commande`);
      await page.getByRole("region", { name: "Choix des cookies publicitaires" }).getByRole("button", { name: "Accepter" }).click();
      await page.waitForFunction(() => window.fbq?.queue?.some(args => args[2] === "InitiateCheckout"));
      assert.equal(await page.evaluate(() => window.fbq?.queue?.filter(args => args[2] === "InitiateCheckout").length ?? 0), 1);
      const quoteResponse = page.waitForResponse(response => response.url().endsWith("/api/cart/quote"));
      await page.reload();
      await quoteResponse;
      assert.equal(await page.evaluate(() => window.fbq?.queue?.filter(args => args[2] === "InitiateCheckout").length ?? 0), 0);
      results.push("Consent accepted on checkout sent one start; reloading the same cart sent no duplicate.");
      await context.close();
    }
    // Snapchat ad landing: consented PAGE_VIEW/VIEW_CONTENT, and the ScCid reaches the order and sub1.
    {
      const sampleSccid = "a1b2c3d4-e5f6-4a7b-8c9d-sample_ScCid";
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      await context.route("**/*", async route => {
        const host = new URL(route.request().url()).hostname;
        if (host.includes("molipy8trk")) { trackingRequests++; await route.abort(); }
        else if (host === "connect.facebook.net" || host === "sc-static.net") await route.abort();
        else await route.continue();
      });
      const page = await context.newPage();
      page.setDefaultNavigationTimeout(90_000);
      page.on("pageerror", error => errors.push(error.message));
      await page.goto(`${base}/produit/veste-bresil-vert?ScCid=${sampleSccid}`, { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => localStorage.getItem("rd.cart.v1") !== null);
      await page.getByRole("region", { name: "Choix des cookies publicitaires" }).getByRole("button", { name: "Accepter" }).click();
      await page.waitForFunction(() => window.snaptr?.queue?.some(args => args[1] === "VIEW_CONTENT"));
      assert.equal(await page.evaluate(() => sessionStorage.getItem("rd.snap.sccid")), sampleSccid);
      const snapEvents = await page.evaluate(() => window.snaptr?.queue?.map(args => [args[0], args[1]]) ?? []);
      assert.deepEqual(snapEvents.filter(([kind]) => kind === "track").map(([, name]) => name), ["PAGE_VIEW", "VIEW_CONTENT"]);
      assert.deepEqual(await page.evaluate(() => window.snaptr?.queue?.find(args => args[1] === "VIEW_CONTENT")?.[2]),
        { item_ids: [fixture.products[0].id], price: "19.99", currency: "EUR" });
      await page.getByRole("combobox", { name: "Taille — Veste Brésil Vert", exact: true }).selectOption("M");
      await page.getByRole("button", { name: /Acheter maintenant/ }).click();
      await page.waitForURL(/\/commande\?achat=/);
      assert.equal(await page.evaluate(() => sessionStorage.getItem("rd.snap.sccid")), sampleSccid);
      await page.getByRole("checkbox", { name: /identifiant de clic Meta ou Snapchat/ }).check();
      await page.getByLabel("Prénom", { exact: true }).fill("Élodie-Anne");
      await page.getByLabel("Nom", { exact: true }).fill("de la Fiction");
      await page.getByLabel("E-mail", { exact: true }).fill("fiction+snap@example.com");
      await page.getByLabel("Téléphone", { exact: true }).fill("+33 6 00 00 00 01");
      await page.getByLabel("Adresse", { exact: true }).fill("14 rue de la Fiction");
      await page.getByLabel("Code postal", { exact: true }).fill("75001");
      await page.getByLabel("Ville", { exact: true }).fill("Paris");
      const orderRequest = page.waitForRequest(request => request.url().endsWith("/api/orders") && request.method() === "POST");
      await page.getByRole("button", { name: /Continuer vers le paiement/ }).click();
      const body = (await orderRequest).postDataJSON();
      assert.equal(body.sccid, sampleSccid); assert.equal(body.fbclid, undefined);
      await page.waitForURL(/\/commande\/paiement-test\//);
      const order = await Order.findOne({ publicToken: page.url().split("/").pop() }).lean(); assert.ok(order);
      assert.equal(order.attribution?.sccid, sampleSccid);
      const partnerUrl = new URL(buildEverflowUrl(order, readEverflowConfig(mockEnvironment(fixture.uri))!, "test-reference", true));
      assert.equal(partnerUrl.searchParams.get("sub1"), sampleSccid);
      assert.equal(partnerUrl.searchParams.get("ScCid"), sampleSccid);
      assert.equal(partnerUrl.searchParams.has("fbclid"), false);
      assert.ok(!(await page.evaluate(() => window.snaptr?.queue?.map(args => args[1]) ?? [])).includes("PURCHASE"));
      await page.screenshot({ path: ".data/everflow-qa/snap-checkout-390.png" });
      results.push("Snapchat landing: consented PAGE_VIEW + VIEW_CONTENT; ScCid kept across navigation, stored on the order and sent in sub1 and ScCid.");
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
    for (const offer of ["single", "bundle"] as const) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await context.newPage();
      await page.goto(`${base}/produit/veste-bresil-vert`);
      await page.getByRole("region", { name: "Choix des cookies publicitaires" }).getByRole("button", { name: "Refuser" }).click();
      if (offer === "bundle") {
        await page.getByText("Le duo · 2 vestes", { exact: true }).click();
        await page.getByRole("combobox", { name: "Taille de la veste 1 — Vert", exact: true }).selectOption("M");
        await page.getByRole("combobox", { name: "Taille de la veste 2 — Rose", exact: true }).selectOption("L");
      } else await page.getByRole("combobox", { name: "Taille — Veste Brésil Vert", exact: true }).selectOption("M");
      const quotePromise = page.waitForResponse(response => response.url().includes("/api/cart/quote") && response.request().method() === "POST");
      await page.getByRole("button", { name: /Acheter maintenant/ }).click();
      await page.waitForURL(/\/commande\?achat=/);
      const quoteResponse = await quotePromise;
      assert.equal((await quoteResponse.json()).quote.totalCents, offer === "bundle" ? 2495 : 1999);
      assert.ok(await page.getByRole("button", { name: /Continuer vers le paiement/ }).isEnabled());
      results.push(`Product Buy now (${offer}) → checkout form with correct EUR quote.`);
      await context.close();
    }
    const cartContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await cartContext.addInitScript(id => localStorage.setItem("rd.cart.v1", JSON.stringify([{ key: "qa-cart-link", kind: "single", productId: id, size: "M", quantity: 1 }])), fixture.products[0].id);
    const cartPage = await cartContext.newPage();
    await cartPage.goto(`${base}/panier`);
    await cartPage.getByRole("region", { name: "Choix des cookies publicitaires" }).getByRole("button", { name: "Refuser" }).click();
    await cartPage.getByRole("link", { name: /Commander ·/ }).click();
    await cartPage.waitForURL(`${base}/commande`);
    assert.ok(await cartPage.getByRole("button", { name: /Continuer vers le paiement/ }).isEnabled());
    results.push("Cart page checkout link → checkout form with the selected single offer.");
    await cartContext.close();
    assert.equal(trackingRequests, 0); assert.deepEqual(errors, []);
    await writeFile(".data/everflow-qa/results.json", JSON.stringify({ results, trackingRequests, errors }, null, 2));
    results.forEach(result => console.log(result)); console.log("No tracking-domain requests; no browser runtime errors.");
  } finally { await browser.close(); await mongoose.disconnect(); }
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Browser QA failed"); process.exit(1); });
