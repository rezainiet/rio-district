/**
 * Production-mode rehearsal in real Chrome, against a PRODUCTION build
 * (`next start`, APP_ENV=production) running on a MIGRATED database — never on
 * the live site. Creates one test order, one review and one contact message in
 * that database.
 *
 *   QA_BASE_URL=http://localhost:3001 QA_ADMIN_EMAIL=… QA_ADMIN_PASSWORD=… npx tsx scripts/qa-production.ts
 *   → docs/screenshots/production/ + .data/qa-production-upload.txt (URL to re-check after a restart)
 */
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium, type Browser, type BrowserContextOptions, type Page } from "playwright-core";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3001";
const OUT = path.resolve("docs/screenshots/production");
const ADMIN = { email: process.env.QA_ADMIN_EMAIL!, password: process.env.QA_ADMIN_PASSWORD! };
let passed = 0;
const ok = (m: string) => {
  passed++;
  console.log(`  ✓ ${m}`);
};

const VP = {
  "mobile-375": [375, 812, true],
  "mobile-390": [390, 844, true],
  "tablette-768": [768, 1024, false],
  "desktop-1440": [1440, 900, false],
} as const;
const opts = (k: keyof typeof VP): BrowserContextOptions => {
  const [width, height, mobile] = VP[k];
  return { viewport: { width, height }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile, reducedMotion: "reduce", locale: "fr-FR", timezoneId: "Europe/Paris" };
};
const shot = async (p: Page, name: string, full = false) => {
  if (full) {
    await p.evaluate(`(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); } scrollTo(0, 0); })()`);
    await p.waitForTimeout(300);
  }
  await p.screenshot({ path: path.join(OUT, `${name}.jpg`), type: "jpeg", quality: 80, fullPage: full });
};
const visibleText = (p: Page) => p.evaluate(`document.body.innerText`) as Promise<string>;
const FORBIDDEN = /d[ée]mo\b|d[ée]monstration|lorem|smoke|kalt/i;

async function headersAndHealth() {
  const health = await fetch(`${BASE}/api/health`).then((r) => r.json());
  assert.equal(health.status, "ok");
  const home = await fetch(`${BASE}/`);
  const h = home.headers;
  assert.match(h.get("strict-transport-security") ?? "", /max-age=31536000/);
  assert.match(h.get("content-security-policy") ?? "", /frame-ancestors 'self'/);
  assert.equal(h.get("x-frame-options"), "SAMEORIGIN");
  assert.equal(h.get("x-content-type-options"), "nosniff");
  assert.equal(h.get("x-powered-by"), null);
  const admin = await fetch(`${BASE}/admin/login`);
  assert.match(admin.headers.get("x-robots-tag") ?? "", /noindex/);
  const webhook = await fetch(`${BASE}/api/payments/webhook/stripe`, { method: "POST", body: "{}" });
  assert.equal(webhook.status, 501, "payment callbacks inactive without a provider");
  ok("santé OK, en-têtes de sécurité (HSTS, CSP, XFO, nosniff), admin noindex, webhook paiement inactif (501)");
}

async function storefront(browser: Browser) {
  for (const k of Object.keys(VP) as (keyof typeof VP)[]) {
    const ctx = await browser.newContext(opts(k));
    const p = await ctx.newPage();
    for (const [url, name] of [["/", "accueil"], ["/produit/veste-bresil-vert", "fiche"], ["/produit/veste-bresil-vert?offre=pack", "fiche-pack"]] as const) {
      await p.goto(`${BASE}${url}`, { waitUntil: "networkidle" });
      const text = await visibleText(p);
      assert.ok(!FORBIDDEN.test(text), `${k} ${url}: contenu interdit « ${text.match(FORBIDDEN)?.[0]} »`);
      assert.ok(text.includes("RIO DISTRICT") || text.includes("Rio District"));
      assert.equal(await p.locator('[role="timer"]').count(), 0, "no countdown without a real campaign");
      assert.ok(await p.evaluate(`document.documentElement.scrollWidth <= innerWidth + 1`), `${k} ${url}: overflow`);
      const imgs = (await p.evaluate(`[...document.images].map(i => ({ src: i.currentSrc || i.src, ok: i.complete && i.naturalWidth > 0, lazy: i.loading === "lazy" }))`)) as { src: string; ok: boolean; lazy: boolean }[];
      for (const i of imgs) {
        assert.ok(new URL(i.src).origin === new URL(BASE).origin, `image hors application : ${i.src}`);
        if (!i.lazy) assert.ok(i.ok, `image non chargée : ${i.src}`);
      }
      if (url === "/") assert.equal(await p.locator("#avis").count(), 0, "no review section on the home page without published reviews");
      if (url.startsWith("/produit") && !url.includes("pack")) {
        assert.ok(/aucun avis publié pour le moment/i.test(text), "honest empty state");
        await p.locator("#avis").scrollIntoViewIfNeeded();
        await shot(p, `${k}-03-fiche-avis-etat-vide`);
      }
      await shot(p, `${k}-0${name === "accueil" ? 1 : name === "fiche" ? 2 : 4}-${name}`, name === "accueil" && (k === "desktop-1440" || k === "mobile-390"));
    }
    await ctx.close();
  }
  ok("4 largeurs : aucun texte démo/KALT, aucun compte à rebours, images servies par l'application, pas de débordement");
}

async function noPopupsByDefault(browser: Browser) {
  const ctx = await browser.newContext(opts("desktop-1440"));
  const p = await ctx.newPage();
  await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await p.waitForTimeout(14_000);
  assert.equal(await p.locator("dialog[open]").count(), 0);
  await p.evaluate(`document.dispatchEvent(new MouseEvent("mouseout", { clientY: -2, relatedTarget: null, bubbles: true }))`);
  await p.waitForTimeout(500);
  assert.equal(await p.locator("dialog[open]").count(), 0);
  ok("aucun pop-up tant qu'aucune campagne n'est activée");
  await ctx.close();
}

/** Every image inside `scope` is brought into view and must actually load (thumbnails included). */
async function imagesLoaded(p: Page, scope: string) {
  const results = (await p.evaluate(`(async () => {
    const imgs = [...document.querySelectorAll(${JSON.stringify(scope)} + " img")];
    const out = [];
    for (const i of imgs) {
      i.scrollIntoView({ block: "center" });
      const ok = await new Promise((r) => {
        if (i.complete && i.naturalWidth) return r(true);
        i.addEventListener("load", () => r(i.naturalWidth > 0), { once: true });
        i.addEventListener("error", () => r(false), { once: true });
        setTimeout(() => r(i.naturalWidth > 0), 6000);
      });
      out.push({ src: i.currentSrc || i.src, ok });
    }
    return out;
  })()`)) as { src: string; ok: boolean }[];
  assert.ok(results.length > 0, `aucune image dans ${scope}`);
  for (const r of results) assert.ok(r.ok, `image non chargée dans ${scope} : ${r.src}`);
  return results.length;
}

async function purchaseFlow(browser: Browser) {
  const ctx = await browser.newContext(opts("mobile-390"));
  const p = await ctx.newPage();
  await p.goto(`${BASE}/produit/veste-bresil-vert`, { waitUntil: "networkidle" });
  await p.locator('input[name="size"][value="M"]').check({ force: true });
  await p.evaluate(`document.querySelector("#acheter div.mt-8 > button").click()`);
  await p.waitForSelector('[aria-labelledby="cart-title"]');
  assert.ok((await p.locator('[aria-labelledby="cart-title"]').innerText()).includes("19,99"));
  await p.keyboard.press("Escape");
  await p.goto(`${BASE}/produit/veste-bresil-vert?offre=pack`, { waitUntil: "networkidle" });
  await p.locator('input[name="size-0"][value="M"]').check({ force: true });
  await p.locator('[aria-label="Couleur de la veste 2"] [aria-label="Jaune"]').click();
  await p.locator('input[name="size-1"][value="L"]').check({ force: true });
  await p.evaluate(`document.querySelector("#acheter div.mt-8 > button").click()`);
  await p.waitForSelector('[aria-labelledby="cart-title"]');
  await p.waitForTimeout(400);
  const drawer = await p.locator('[aria-labelledby="cart-title"]').innerText();
  assert.ok(drawer.includes("24,95") && drawer.includes("44,94"), "single + pack = 44,94 €");
  const drawerImgs = await imagesLoaded(p, '[aria-labelledby="cart-title"]');
  await p.locator('[aria-labelledby="cart-title"] h2').scrollIntoViewIfNeeded();
  await shot(p, "mobile-390-05-tiroir-panier");
  await p.goto(`${BASE}/commande`, { waitUntil: "networkidle" });
  const checkoutImgs = await imagesLoaded(p, "main");
  await p.evaluate(`scrollTo(0, 0)`);
  ok(`miniatures chargées : tiroir panier (${drawerImgs}), commande (${checkoutImgs})`);
  await p.fill("#co-fullName", "Recette Production");
  await p.fill("#co-email", "recette.production@example.com");
  await p.fill("#co-phone", "0612345678");
  await p.fill("#co-address", "1 rue de la Recette");
  await p.fill("#co-postalCode", "75001");
  await p.fill("#co-city", "Paris");
  await shot(p, "mobile-390-06-commande");
  await p.locator('form button[type="submit"]').last().click();
  await p.waitForURL(/\/commande\/confirmation\//, { timeout: 15_000 });
  const conf = await visibleText(p);
  assert.ok(conf.includes("Non payée") && conf.includes("44,94"), "accurate unpaid confirmation");
  assert.match(conf, /RD-\d{5}/, "new order number format");
  await shot(p, "mobile-390-07-confirmation");
  ok("veste seule + pack (44,94 €), commande enregistrée « Non payée », numéro RD-xxxxx");
  await ctx.close();
}

async function reviewAndContact(browser: Browser) {
  const ctx = await browser.newContext(opts("desktop-1440"));
  const p = await ctx.newPage();
  await p.goto(`${BASE}/produit/veste-bresil-noir`, { waitUntil: "networkidle" });
  await p.locator("#avis").getByRole("button", { name: "Écrire un avis" }).click();
  await p.locator('label:has(input[name="rating-choice"][value="5"])').click();
  await p.fill("#rv-title", "Recette de production");
  await p.fill("#rv-text", "Avis envoyé pendant la recette de production, à rejeter ensuite.");
  await p.fill("#rv-name", "Recette Prod");
  await p.fill("#rv-email", "recette.avis@example.com");
  await p.check('input[name="consent"]');
  // A real (small) photo, to check storage, moderation gating and persistence after a restart.
  const sharp = (await import("sharp")).default;
  const photo = await sharp({ create: { width: 320, height: 400, channels: 3, background: "#c8a96a" } }).jpeg().toBuffer();
  await p.locator('input[name="photos"]').setInputFiles({ name: "recette.jpg", mimeType: "image/jpeg", buffer: photo });
  await p.getByRole("button", { name: "Envoyer mon avis" }).click();
  await p.waitForSelector("text=Merci !");
  await p.keyboard.press("Escape");
  assert.ok(!/recette de production/i.test(await visibleText(p)), "submitted review is not published");
  await p.goto(`${BASE}/#contact`, { waitUntil: "networkidle" });
  await p.fill("#contact-email", "recette.contact@example.com");
  await p.fill("#contact-message", "Message de recette de production, à archiver.");
  await p.getByRole("button", { name: /Envoyer/ }).click();
  await p.waitForSelector("text=Message reçu.");
  ok("avis envoyé → en attente (non affiché) ; formulaire de contact envoyé");
  await ctx.close();
}

async function admin(browser: Browser) {
  const ctx = await browser.newContext(opts("desktop-1440"));
  const p = await ctx.newPage();
  await p.goto(`${BASE}/admin`);
  await p.waitForURL(/\/admin\/login/);
  await p.fill('input[type="email"]', ADMIN.email);
  await p.fill('input[type="password"]', ADMIN.password);
  await p.click('button[type="submit"]');
  await p.waitForURL(`${BASE}/admin`);
  const cookie = (await ctx.cookies()).find((c) => c.name === "rd_admin");
  assert.ok(cookie?.secure && cookie.httpOnly && cookie.sameSite === "Lax", "admin cookie Secure + HttpOnly + Lax");
  assert.ok((await visibleText(p)).includes("RIO DISTRICT"));
  await shot(p, "desktop-1440-10-admin-tableau-de-bord");

  await p.goto(`${BASE}/admin/commandes`, { waitUntil: "networkidle" });
  assert.match(await visibleText(p), /RD-\d{5}/);
  await p.goto(`${BASE}/admin/produits`, { waitUntil: "networkidle" });
  assert.equal(await p.locator("tbody tr, ul li").filter({ hasText: "Veste Brésil" }).count() >= 6, true);
  const adminThumbs = await imagesLoaded(p, "main");
  await p.evaluate(`scrollTo(0, 0)`);
  await shot(p, "desktop-1440-11-admin-produits");
  ok(`admin : ${adminThumbs} miniatures produits chargées`);

  // Product management + inventory: edit the blue jacket, track its stock, order one, check the decrement, restore.
  await p.getByRole("link", { name: "Veste Brésil Bleu" }).click();
  await p.waitForURL(/\/admin\/produits\/[a-f0-9]{24}$/);
  const productId = p.url().split("/").pop()!;
  const taglineBefore = await p.inputValue("#p-tagline");
  const priceBefore = await p.inputValue("#p-price");
  await p.fill("#p-tagline", "Accroche modifiée pendant la recette");
  await p.fill('input[aria-label="Stock M"]', "5");
  await p.getByRole("button", { name: "Enregistrer" }).click();
  await p.waitForSelector("text=Produit enregistré.");
  const shopPage = await ctx.newPage();
  await shopPage.goto(`${BASE}/produit/veste-bresil-bleu`, { waitUntil: "networkidle" });
  assert.ok((await visibleText(shopPage)).includes("Accroche modifiée pendant la recette"), "admin edit visible on the shop");
  const order = await p.request.post(`${BASE}/api/orders`, {
    headers: { Origin: BASE, "Content-Type": "application/json" },
    data: {
      idempotencyKey: `recette-stock-${Date.now()}`,
      lines: [{ kind: "single", productId, size: "M", quantity: 1, unitPriceCents: 1 }],
      customer: { fullName: "Recette Stock", email: "recette.stock@example.com", phone: "0612345678", address: "1 rue du Stock", postalCode: "75001", city: "Paris", country: "FR" },
    },
  });
  assert.equal(order.status(), 201);
  assert.equal((await order.json()).order.totalCents, 1999, "server price, client price ignored");
  await p.reload({ waitUntil: "networkidle" });
  assert.equal(await p.inputValue('input[aria-label="Stock M"]'), "4", "stock decremented by the order");
  await p.fill("#p-tagline", taglineBefore);
  await p.fill('input[aria-label="Stock M"]', "");
  await p.getByRole("button", { name: "Enregistrer" }).click();
  await p.waitForSelector("text=Produit enregistré.");
  await p.reload({ waitUntil: "networkidle" });
  assert.equal(await p.inputValue("#p-tagline"), taglineBefore);
  assert.equal(await p.inputValue("#p-price"), priceBefore, "price untouched");
  await shopPage.close();
  ok("gestion produit : modification visible en boutique, stock suivi 5 → 4 après commande, prix serveur, valeurs restaurées");

  await p.goto(`${BASE}/admin/avis?statut=pending`, { waitUntil: "networkidle" });
  const reviews = await visibleText(p);
  assert.ok(reviews.includes("Importé (boutique de référence)") && reviews.includes("Date d'origine inconnue"));
  assert.ok(/recette de production/i.test(reviews));
  await shot(p, "desktop-1440-12-admin-avis-en-attente", true);
  // Publish the rehearsal review, check it on the shop, then reject it.
  const row = p.locator("li", { hasText: "Recette de production" });
  await row.getByRole("button", { name: "Approuver et publier" }).click();
  await p.waitForTimeout(800);
  const shop = await ctx.newPage();
  await shop.goto(`${BASE}/produit/veste-bresil-bleu`, { waitUntil: "networkidle" });
  assert.ok((await visibleText(shop)).includes("Recette P."), "published review shown (first name + initial)");
  const reviewPhoto = await shop.locator('#avis img[src^="/uploads/reviews/"]').first().getAttribute("src");
  assert.ok(reviewPhoto, "review photo shown once published");
  assert.equal((await fetch(`${BASE}${reviewPhoto}`)).status, 200, "published review photo is public");
  writeFileSync(".data/qa-production-review-photo.txt", reviewPhoto!);
  ok("admin : cookie sécurisé, commandes RD-, 6 produits, avis importés en attente sans date, avis client publié avec sa photo");

  // Image upload into UPLOAD_DIR.
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
  const up = await p.request.post(`${BASE}/api/admin/uploads`, { headers: { Origin: BASE }, multipart: { file: { name: "recette.png", mimeType: "image/png", buffer: png } } });
  assert.equal(up.status(), 201);
  const { url } = await up.json();
  assert.equal((await p.request.get(`${BASE}${url}`)).status(), 200);
  writeFileSync(".data/qa-production-upload.txt", url);
  ok(`téléversement admin servi depuis UPLOAD_DIR (${url})`);

  // Promotions: switch the welcome pop-up and a short real countdown on, check, then off again.
  await p.goto(`${BASE}/admin/promotions`, { waitUntil: "networkidle" });
  await shot(p, "desktop-1440-13-admin-promotions", true);
  const save = (body: unknown) => p.request.put(`${BASE}/api/admin/promotions`, { headers: { Origin: BASE, "Content-Type": "application/json" }, data: body });
  const endsAt = new Date(Date.now() + 75_000).toISOString();
  const cd = { enabled: true, title: "Recette compte à rebours", text: "", ctaLabel: "", ctaHref: "", startsAt: null, endsAt, placement: { home: true, product: false } };
  const popups = (await import("../src/lib/marketing")).DEFAULT_POPUPS;
  const on = { ...popups, welcome: { ...popups.welcome, enabled: true, delaySeconds: 5 } };
  assert.equal((await save({ countdown: cd, popups: on })).status(), 200);
  const v = await browser.newContext(opts("mobile-390"));
  const vp = await v.newPage();
  await vp.goto(`${BASE}/`, { waitUntil: "networkidle" });
  assert.equal(await vp.locator('[role="timer"]').count(), 1);
  await vp.waitForSelector("dialog[open]", { timeout: 9000 });
  assert.match(await vp.locator("dialog[open]").innerText(), /bienvenue chez rio district/i);
  await vp.waitForTimeout(300);
  await shot(vp, "mobile-390-08-popup-bienvenue-active");
  await vp.keyboard.press("Escape");
  await vp.reload({ waitUntil: "networkidle" });
  await vp.waitForTimeout(7000);
  assert.equal(await vp.locator("dialog[open]").count(), 0, "dismissal respected");
  await vp.goto(`${BASE}/commande`, { waitUntil: "networkidle" });
  assert.equal(await vp.locator("dialog[open]").count(), 0);
  // Wait for the real deadline, then the countdown must be gone everywhere.
  const left = Date.parse(endsAt) - Date.now() + 1500;
  if (left > 0) await vp.waitForTimeout(left);
  await vp.goto(`${BASE}/`, { waitUntil: "networkidle" });
  assert.equal(await vp.locator('[role="timer"]').count(), 0, "expired countdown disappears");
  await v.close();
  assert.equal((await save({ countdown: { ...cd, enabled: false, title: "", endsAt: null }, popups })).status(), 200);
  ok("promotions : activation par l'admin, pop-up affiché puis respecté après fermeture, rien sur /commande, compte à rebours expiré automatiquement, tout désactivé à nouveau");
  await ctx.close();
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  assert.ok(ADMIN.email && ADMIN.password, "QA_ADMIN_EMAIL / QA_ADMIN_PASSWORD requis");
  await headersAndHealth();
  const browser = await chromium.launch({ channel: "chrome" });
  try {
    await storefront(browser);
    await noPopupsByDefault(browser);
    await purchaseFlow(browser);
    await reviewAndContact(browser);
    await admin(browser);
  } finally {
    await browser.close();
  }
  console.log(`\n${passed} vérifications en mode production réussies.`);
}

main().catch((e) => {
  console.error("✗", e);
  process.exit(1);
});
