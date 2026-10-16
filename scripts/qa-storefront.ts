/**
 * Storefront interaction QA in real Chrome (mobile 390 and 320, desktop 1440).
 * Read-only: the order form is validated but never submitted. Needs `npm run dev`
 * (or QA_BASE_URL pointing at a local production build).
 *
 *   npx tsx scripts/qa-storefront.ts   → docs/storefront-redesign/qa.json
 */
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { chromium, type Browser, type BrowserContextOptions, type Page } from "playwright-core";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3000";
const SLUG = "veste-bresil-vert";
const QUIET = `(() => { try { const n = String(Date.now()); for (const k of ["welcome","exitIntent","cartReminder"]) localStorage.setItem("rd.popup." + k, n); localStorage.setItem("rd.seen","1"); } catch {} })()`;
const results: { ok: boolean; msg: string }[] = [];
const ok = (msg: string) => {
  results.push({ ok: true, msg });
  console.log(`  ✓ ${msg}`);
};

const mobile = (w = 390): BrowserContextOptions => ({ viewport: { width: w, height: w <= 375 ? 667 : 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "fr-FR", timezoneId: "Europe/Paris" });
const desktop: BrowserContextOptions = { viewport: { width: 1440, height: 900 }, locale: "fr-FR", timezoneId: "Europe/Paris" };

async function open(browser: Browser, o: BrowserContextOptions) {
  const ctx = await browser.newContext({ ...o, reducedMotion: "reduce" });
  await ctx.addInitScript(QUIET);
  const p = await ctx.newPage();
  const errors: string[] = [];
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => m.type() === "error" && !/favicon|Failed to load resource|Download the React DevTools/.test(m.text()) && errors.push(m.text()));
  return { ctx, p, errors };
}

const inView = (p: Page, sel: string) => p.evaluate(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return false; const b = e.getBoundingClientRect(); return b.top >= 0 && b.bottom <= innerHeight; })()`) as Promise<boolean>;

async function productFirstScreen(browser: Browser, w: number) {
  const { ctx, p, errors } = await open(browser, mobile(w));
  await p.goto(`${BASE}/produit/${SLUG}`, { waitUntil: "networkidle" });
  const seen = {
    titre: await inView(p, "main h1"),
    note: await inView(p, 'main a[href="#avis"]'),
    prix: await inView(p, "main .price"),
    stock: await inView(p, 'main [role="status"]'),
  };
  const deliveryTop = (await p.evaluate(`(() => { const e = [...document.querySelectorAll("main p")].find((x) => /^Livrée /.test(x.textContent.trim())); return e ? e.getBoundingClientRect().top : 9999; })()`)) as number;
  assert.ok(seen.titre && seen.note && seen.prix && seen.stock, `@${w}: first screen ${JSON.stringify(seen)}`);
  ok(`fiche @${w} : titre, note, prix et stock au 1er écran ; date de livraison à ${Math.round(deliveryTop)} px (écran ${w <= 375 ? 667 : 844} px)`);
  assert.deepEqual(errors, []);
  await ctx.close();
}

async function productFlow(browser: Browser) {
  const { ctx, p, errors } = await open(browser, mobile());
  await p.goto(`${BASE}/produit/${SLUG}`, { waitUntil: "networkidle" });
  const bar = p.locator("[data-sticky-bar]");

  // Sticky bar visible on the first screen (purchase zone below), with "Choisir ma taille".
  assert.equal(await bar.getAttribute("aria-hidden"), "false", "sticky bar visible on first screen");
  await bar.getByRole("button", { name: "Choisir ma taille" }).click();
  await p.waitForTimeout(800);
  assert.ok(await inView(p, "#field-single"), "sticky CTA brings the size picker into view");
  await p.waitForTimeout(300);
  assert.equal(await bar.getAttribute("aria-hidden"), "true", "sticky bar hidden over the options");
  ok("barre collante : visible au 1er écran, « Choisir ma taille » amène au sélecteur, puis se masque sur les options");

  // Rating → reviews.
  await p.evaluate(`scrollTo(0, 0)`);
  await p.locator('main a[href="#avis"]:visible').first().click();
  await p.waitForTimeout(800);
  const avisTop = (await p.evaluate(`document.querySelector("#avis").getBoundingClientRect().top`)) as number;
  assert.ok(avisTop > -10 && avisTop < 200, `rating link scrolls to reviews (${avisTop})`);
  ok("note cliquable → section avis");

  // Colour dot on the photo switches product.
  await p.evaluate(`scrollTo(0, 0)`);
  await p.getByRole("link", { name: "Coloris Noir" }).first().click();
  await p.waitForURL(/veste-bresil-noir/);
  await p.locator("main h1", { hasText: "Veste Brésil Noir" }).waitFor();
  ok("pastille de couleur sur la photo → fiche Noir");

  // Single: size → add → drawer confirmation, count, continue shopping.
  await p.locator('input[name="size"][value="M"]').check({ force: true });
  await p.locator("#acheter").getByRole("button", { name: /Ajouter au panier · 19,99/ }).click();
  const drawer = p.locator('[aria-labelledby="cart-title"]');
  await drawer.waitFor();
  const dtext = await drawer.innerText();
  assert.match(dtext, /Ajouté au panier/);
  assert.match(dtext, /Veste Brésil Noir · taille M/);
  assert.match(dtext, /Une 2e veste pour 4,96/);
  assert.match(dtext, /Retour possible sous 15 jours/);
  assert.match(await p.getByRole("button", { name: /Ouvrir le panier, 1 article/ }).getAttribute("aria-label") ?? "", /1 article/);
  await drawer.getByRole("button", { name: "Continuer mes achats" }).click();
  await p.waitForTimeout(400);
  assert.equal(await drawer.count(), 0, "drawer closes");
  // Reopened from the header: cart only, no "just added" message.
  await p.getByRole("button", { name: /Ouvrir le panier/ }).click();
  await drawer.waitFor();
  assert.ok(!/Ajouté au panier/.test(await drawer.innerText()), "no confirmation when opened from the header");
  await p.keyboard.press("Escape");
  await p.waitForTimeout(300);
  ok("ajout 19,99 € : confirmation « Ajouté au panier » + variante, compteur à 1, suggestion pack honnête (+4,96 €), « Continuer mes achats », Échap");

  // Pack: both sizes required, then 24,95 €.
  await p.goto(`${BASE}/produit/${SLUG}`, { waitUntil: "networkidle" });
  await p.locator("#acheter").getByText("2 vestes", { exact: true }).click();
  await p.waitForTimeout(200);
  const zone = await p.locator("#acheter").innerText();
  assert.ok(/24,95/.test(zone) && /39,98/.test(zone) && /15,03/.test(zone) && /38/.test(zone), "pack prices visible");
  await p.locator("#acheter").getByRole("button", { name: /Ajouter le pack/ }).click();
  await p.waitForTimeout(600);
  assert.ok(await p.locator("#field-slot0 [role=alert]").isVisible(), "missing size error for jacket 1");
  await p.locator('input[name="size-0"][value="S"]').check({ force: true });
  await p.locator("#field-slot1").getByRole("radio", { name: "Jaune" }).click();
  await p.locator('input[name="size-1"][value="XL"]').check({ force: true });
  await p.locator("#acheter").getByRole("button", { name: /Ajouter le pack · 24,95/ }).click();
  await drawer.waitFor();
  const pack = await drawer.innerText();
  assert.match(pack, /Pack 2 vestes · Vert S \+ Jaune XL/);
  assert.match(pack, /Commander · 44,94/);
  ok("pack : taille manquante signalée, Vert S + Jaune XL → 24,95 €, panier total 44,94 €");

  // Server quote agrees with the drawer (pricing stays server-side).
  const lines = await p.evaluate(`JSON.parse(localStorage.getItem("rd.cart.v1")).map(({ key, ...l }) => l)`);
  const quote = await (await p.request.post(`${BASE}/api/cart/quote`, { data: { lines }, headers: { Origin: BASE } })).json();
  assert.equal(quote.quote.totalCents, 4494, "server total");
  ok("prix serveur (/api/cart/quote) : 44,94 € identique au tiroir");

  // Checkout: validation, keyboard hints, summary — not submitted.
  await p.goto(`${BASE}/commande`, { waitUntil: "networkidle" });
  const attrs = await p.evaluate(`[...document.querySelectorAll("form input, form select")].filter(e => e.id).map(e => e.id + ":" + (e.type || "") + ":" + (e.getAttribute("autocomplete") || "") + ":" + (e.getAttribute("inputmode") || "")).join(" ")`);
  for (const need of ["co-email:email:email:email", "co-phone:tel:tel:tel", "co-postalCode:text:postal-code:numeric", "co-fullName:text:name", "co-city:text:address-level2"]) assert.ok(String(attrs).includes(need), `checkout attr ${need}`);
  await p.getByRole("button", { name: /Envoyer ma demande · 44,94/ }).click();
  await p.waitForTimeout(400);
  const alerts = await p.locator("form [role=alert]").count();
  assert.ok(alerts >= 5, `validation messages (${alerts})`);
  const focused = (await p.evaluate(`document.activeElement?.id`)) as string;
  const labels = await p.evaluate(`[...document.querySelectorAll("form input:not([type=hidden]), form select, form textarea")].filter(e => e.id && !e.closest("[aria-hidden=true]")).every(e => { const l = document.querySelector('label[for="' + e.id + '"]'); return l && l.getBoundingClientRect().height > 0; })`);
  assert.ok(labels, "every checkout field has a visible label");
  ok(`commande : types de clavier et autocomplete corrects, ${alerts} messages d'erreur à l'envoi vide (focus: ${focused || "—"}), étiquettes visibles, total 44,94 € — non soumise`);
  assert.deepEqual(errors, [], `JS errors: ${errors.join(" | ")}`);
  await ctx.close();
}

async function navigation(browser: Browser) {
  const { ctx, p, errors } = await open(browser, mobile());
  await p.goto(BASE, { waitUntil: "networkidle" });
  assert.ok(await inView(p, "#hero-title"), "home h1 visible");
  const firstScreen = await p.evaluate(`(() => { const t = document.body.innerText; const b = [...document.querySelectorAll("main a, main button")].filter(e => { const r = e.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; }).map(e => e.textContent.trim()); return { prix: /19,99/.test(t) && /24,95/.test(t), cta: b.some(x => /Choisir ma veste/.test(x)) }; })()`);
  ok(`accueil 1er écran : ${JSON.stringify(firstScreen)}`);
  await p.getByRole("button", { name: "Ouvrir le menu" }).click();
  const menu = p.locator("#mobile-menu");
  await menu.waitFor({ state: "visible" });
  assert.equal(await p.evaluate(`document.body.style.overflow`), "hidden", "scroll locked under the menu");
  await p.keyboard.press("Escape");
  await menu.waitFor({ state: "hidden" });
  await p.getByRole("button", { name: "Ouvrir le menu" }).click();
  await menu.getByRole("link", { name: /Retours & remboursements/ }).click();
  await p.waitForURL(/retours-remboursements/);
  assert.match(await p.locator("main").innerText(), /Retour possible sous 15 jours après réception/);
  ok("menu mobile : ouverture, verrouillage du défilement, Échap, lien Retours & remboursements");
  assert.match(await p.locator("footer").innerText(), /Retours & remboursements/);
  // Every customer page states 15 days, never 14.
  for (const path of ["/", `/produit/${SLUG}`, "/panier", "/livraison-retours", "/retours-remboursements"]) {
    await p.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
    const t = await p.locator("body").innerText();
    assert.ok(!/14 jours/.test(t), `${path}: mentions 14 jours`);
    assert.ok(!/sécurisé|crypté/i.test(t), `${path}: payment security claim`);
  }
  ok("15 jours partout (accueil, fiche, panier, livraison, retours) ; aucune mention « paiement sécurisé »");
  assert.deepEqual(errors, [], `JS errors: ${errors.join(" | ")}`);
  await ctx.close();
}

async function keyboard(browser: Browser) {
  const { ctx, p } = await open(browser, desktop);
  await p.goto(`${BASE}/produit/${SLUG}`, { waitUntil: "networkidle" });
  // Size radios are reachable and selectable with the keyboard.
  await p.locator('input[name="size"][value="S"]').focus();
  await p.keyboard.press("ArrowRight");
  const picked = await p.evaluate(`document.querySelector('input[name="size"]:checked')?.value`);
  assert.equal(picked, "M", "arrow keys move the size selection");
  const outline = await p.evaluate(`getComputedStyle(document.activeElement.closest("label")).outlineStyle + "/" + getComputedStyle(document.activeElement).outlineStyle`);
  ok(`clavier : flèches sur les tailles (S → ${picked}) ; focus ${outline}`);
  await ctx.close();
}

async function main() {
  const browser = await chromium.launch({ channel: "chrome" });
  try {
    for (const w of [320, 375, 390, 414]) await productFirstScreen(browser, w);
    await productFlow(browser);
    await navigation(browser);
    await keyboard(browser);
  } finally {
    await browser.close();
    writeFileSync("docs/storefront-redesign/qa.json", JSON.stringify(results, null, 2));
  }
  console.log(`✓ ${results.length} vérifications`);
}

main().catch((e) => {
  console.error("✗", e.message ?? e);
  process.exit(1);
});
