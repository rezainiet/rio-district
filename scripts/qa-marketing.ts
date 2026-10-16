/**
 * Real-Chrome QA + screenshots for reviews, the countdown and pop-ups.
 * Needs the dev server running against the DEMO database:
 *
 *   npx tsx scripts/demo-marketing.ts
 *   MONGODB_URI=mongodb://127.0.0.1:27017/kalt_demo npm run dev
 *   npx tsx scripts/qa-marketing.ts            → docs/screenshots/marketing/
 *
 * Read-only: it never submits a review or an order.
 */
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { chromium, type Browser, type BrowserContextOptions, type Page } from "playwright-core";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3000";
const OUT = path.resolve("docs/screenshots/marketing");
const results: string[] = [];
const ok = (msg: string) => {
  results.push(`✓ ${msg}`);
  console.log(`  ✓ ${msg}`);
};

const VIEWPORTS = {
  "mobile-375": { width: 375, height: 812, mobile: true },
  "mobile-390": { width: 390, height: 844, mobile: true },
  "tablette-768": { width: 768, height: 1024, mobile: false },
  "desktop-1440": { width: 1440, height: 900, mobile: false },
} as const;
type VP = keyof typeof VIEWPORTS;

function ctxOpts(vp: VP, reduce = true): BrowserContextOptions {
  const v = VIEWPORTS[vp];
  return {
    viewport: { width: v.width, height: v.height },
    deviceScaleFactor: v.mobile ? 2 : 1,
    isMobile: v.mobile,
    hasTouch: v.mobile,
    reducedMotion: reduce ? "reduce" : "no-preference",
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
  };
}

/** Marks every pop-up as recently seen so static screenshots are not interrupted. */
const QUIET = `(() => { try { const n = String(Date.now()); for (const k of ["welcome","exitIntent","cartReminder"]) localStorage.setItem("rd.popup." + k, n); localStorage.setItem("rd.seen","1"); } catch {} })()`;

async function shot(page: Page, name: string, full = false) {
  if (full) {
    await page.evaluate(`(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise(r => setTimeout(r, 80)); } scrollTo(0, 0); })()`);
    await page.waitForTimeout(400);
  }
  await page.screenshot({ path: path.join(OUT, `${name}.jpg`), type: "jpeg", quality: 82, fullPage: full });
  console.log(`    → ${name}.jpg`);
}

const noOverflow = (page: Page) => page.evaluate(`document.documentElement.scrollWidth <= innerWidth + 1`) as Promise<boolean>;
const openDialogs = (page: Page) => page.evaluate(`document.querySelectorAll("dialog[open]").length`) as Promise<number>;

async function storefront(browser: Browser) {
  for (const vp of Object.keys(VIEWPORTS) as VP[]) {
    const ctx = await browser.newContext(ctxOpts(vp));
    await ctx.addInitScript(QUIET);
    const p = await ctx.newPage();

    await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
    assert.ok(await p.locator('[role="timer"]').first().isVisible(), "countdown visible on home");
    assert.ok(await noOverflow(p), `${vp}: home overflows`);
    await p.locator("#campagne-title").scrollIntoViewIfNeeded();
    await p.evaluate(`scrollBy(0, -120)`);
    await p.waitForTimeout(300);
    await shot(p, `${vp}-01-accueil-compte-a-rebours`);
    await p.locator("#avis").scrollIntoViewIfNeeded();
    await p.evaluate(`scrollBy(0, -20)`);
    await p.waitForTimeout(300);
    await shot(p, `${vp}-02-accueil-avis`);
    if (vp === "desktop-1440" || vp === "mobile-390") await shot(p, `${vp}-00-accueil-page-complete`, true);

    await p.goto(`${BASE}/produit/veste-bresil-vert`, { waitUntil: "networkidle" });
    assert.ok(await noOverflow(p), `${vp}: product page overflows`);
    assert.ok(!(await p.content()).includes("En attente de modération"), "pending review must not be shown");
    await shot(p, `${vp}-03-fiche-compte-a-rebours`);
    await p.locator("#avis").scrollIntoViewIfNeeded();
    await p.evaluate(`scrollBy(0, -20)`);
    await p.waitForTimeout(300);
    await shot(p, `${vp}-04-fiche-avis`);

    if (vp === "mobile-390" || vp === "desktop-1440") {
      const more = p.getByRole("button", { name: /Voir plus d'avis/ });
      if (await more.count()) {
        const before = await p.locator("#avis li.flex.flex-col").count();
        await more.click();
        assert.ok((await p.locator("#avis li.flex.flex-col").count()) > before, "show more reveals reviews");
        ok(`${vp}: « Voir plus d'avis » affiche les avis suivants`);
      }
      await p.locator("#avis").getByRole("button", { name: "Écrire un avis" }).click();
      await p.waitForTimeout(400);
      assert.equal(await openDialogs(p), 1);
      await shot(p, `${vp}-05-formulaire-avis`);
      await p.keyboard.press("Escape");
      await p.waitForTimeout(200);
      assert.equal(await openDialogs(p), 0, "Escape closes the review form");
      ok(`${vp}: formulaire d'avis ouvert/fermé au clavier (Échap)`);
    }
    ok(`${vp}: compte à rebours + avis rendus, aucun débordement horizontal`);
    await ctx.close();
  }
}

/** The countdown must fit its band at every width (including the in-between 1024–1280 range). */
const timerFits = (page: Page) =>
  page.evaluate(`[...document.querySelectorAll('[role="timer"]')].every((t) => {
    const band = t.closest(".rounded-\\\\[18px\\\\], .rounded-xl"); const a = t.getBoundingClientRect(); const b = band.getBoundingClientRect();
    return a.right <= b.right + 0.5 && a.left >= b.left - 0.5;
  })`) as Promise<boolean>;

async function inBetweenWidths(browser: Browser) {
  for (const width of [1024, 1180, 1280]) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, locale: "fr-FR" });
    await ctx.addInitScript(QUIET);
    const p = await ctx.newPage();
    for (const url of ["/", "/produit/veste-bresil-vert"]) {
      await p.goto(`${BASE}${url}`, { waitUntil: "networkidle" });
      assert.ok(await noOverflow(p), `${width}px ${url} overflows`);
      assert.ok(await timerFits(p), `${width}px ${url}: countdown overflows its band`);
    }
    await ctx.close();
  }
  ok("compte à rebours contenu dans son bloc à 1024, 1180 et 1280 px");
}

async function countdownTicks(browser: Browser) {
  const ctx = await browser.newContext(ctxOpts("desktop-1440"));
  await ctx.addInitScript(QUIET);
  const p = await ctx.newPage();
  await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
  const read = () => p.locator('[role="timer"]').first().innerText();
  const a = await read();
  await p.waitForTimeout(2200);
  const b = await read();
  assert.notEqual(a, b, "the countdown ticks");
  const label = await p.locator('[role="timer"]').first().getAttribute("aria-label");
  await p.reload({ waitUntil: "networkidle" });
  assert.equal(await p.locator('[role="timer"]').first().getAttribute("aria-label"), label, "same deadline after reload");
  ok("compte à rebours : décompte en direct, même échéance après rechargement");
  await ctx.close();
}

async function welcome(browser: Browser) {
  for (const vp of ["desktop-1440", "mobile-390", "mobile-375", "tablette-768"] as VP[]) {
    const ctx = await browser.newContext(ctxOpts(vp));
    const p = await ctx.newPage();
    await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
    assert.equal(await openDialogs(p), 0, "not shown immediately");
    await p.waitForSelector("dialog[open]", { timeout: 9000 });
    await p.waitForTimeout(400);
    await shot(p, `${vp}-06-popup-bienvenue`);
    if (vp === "desktop-1440") {
      const inside = await p.evaluate(`!!document.activeElement?.closest("dialog[open]")`);
      assert.ok(inside, "focus moves into the dialog");
      for (let i = 0; i < 6; i++) await p.keyboard.press("Tab");
      assert.ok(await p.evaluate(`!!document.activeElement?.closest("dialog[open]")`), "focus stays trapped");
      await p.keyboard.press("Escape");
      await p.waitForTimeout(200);
      assert.equal(await openDialogs(p), 0, "Escape closes");
      await p.reload({ waitUntil: "networkidle" });
      await p.waitForTimeout(7500);
      assert.equal(await openDialogs(p), 0, "not shown again after dismissal");
      ok("bienvenue : délai respecté, focus piégé, Échap ferme, pas de réaffichage après fermeture");
    }
    assert.ok(await noOverflow(p));
    await ctx.close();
  }

  // Never on checkout / cart.
  for (const route of ["/commande", "/panier"]) {
    const ctx = await browser.newContext(ctxOpts("desktop-1440"));
    const p = await ctx.newPage();
    await p.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
    await p.waitForTimeout(7500);
    assert.equal(await openDialogs(p), 0, `no pop-up on ${route}`);
    await ctx.close();
  }
  ok("aucun pop-up sur /commande ni /panier");

  // Never stacked over the cart drawer: waits until it is closed.
  const ctx = await browser.newContext(ctxOpts("desktop-1440"));
  const p = await ctx.newPage();
  await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await p.evaluate(`document.querySelector('button[aria-label^="Ouvrir le panier"]').click()`);
  await p.waitForTimeout(6500);
  assert.equal(await openDialogs(p), 0, "no pop-up over the open drawer");
  await p.keyboard.press("Escape");
  await p.waitForSelector("dialog[open]", { timeout: 6000 });
  assert.equal(await p.locator('[aria-labelledby="cart-title"]').count(), 0);
  ok("pas d'empilement : le pop-up attend la fermeture du tiroir panier");
  await ctx.close();
}

async function exitIntent(browser: Browser) {
  const ctx = await browser.newContext(ctxOpts("desktop-1440"));
  await ctx.addInitScript(`try { localStorage.setItem("rd.popup.welcome", String(Date.now())); } catch {}`);
  const p = await ctx.newPage();
  await p.goto(`${BASE}/produit/veste-bresil-vert`, { waitUntil: "networkidle" });
  const leave = `document.dispatchEvent(new MouseEvent("mouseout", { clientY: -2, clientX: 700, relatedTarget: null, bubbles: true }))`;
  await p.evaluate(leave);
  await p.waitForTimeout(300);
  assert.equal(await openDialogs(p), 0, "not before the minimum time on site");
  await p.waitForTimeout(5200);
  await p.mouse.move(700, 300);
  await p.mouse.move(700, 2);
  await p.evaluate(leave);
  await p.waitForSelector("dialog[open]", { timeout: 3000 });
  await p.waitForTimeout(400);
  await shot(p, "desktop-1440-07-popup-sortie");
  await p.getByRole("button", { name: "Non merci" }).click();
  await p.evaluate(leave);
  await p.waitForTimeout(400);
  assert.equal(await openDialogs(p), 0, "not shown twice");
  ok("intention de sortie : déclenchée par la sortie vers le haut, une seule fois");
  await ctx.close();

  const mob = await browser.newContext(ctxOpts("mobile-390"));
  await mob.addInitScript(`try { localStorage.setItem("rd.popup.welcome", String(Date.now())); } catch {}`);
  const m = await mob.newPage();
  await m.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await m.waitForTimeout(5500);
  await m.evaluate(leave);
  await m.waitForTimeout(500);
  assert.equal(await openDialogs(m), 0, "no exit intent on touch devices");
  ok("intention de sortie : désactivée sur mobile");
  await mob.close();
}

async function cartReminder(browser: Browser) {
  const ids = await (async () => {
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    const r = await p.request.get(`${BASE}/produit/veste-bresil-vert`);
    const html = await r.text();
    await ctx.close();
    const m = [...html.matchAll(/\\"id\\":\\"([a-f0-9]{24})\\",\\"slug\\":\\"veste-bresil-(vert|jaune)\\"/g)];
    return Object.fromEntries(m.map((x) => [x[2], x[1]]));
  })();
  assert.ok(ids.vert && ids.jaune, "product ids");
  const cart = JSON.stringify([
    { key: "qa-1", kind: "bundle", items: [{ productId: ids.vert, size: "M" }, { productId: ids.jaune, size: "L" }], quantity: 1 },
  ]);
  const returning = `try { if (!sessionStorage.getItem("qa")) { sessionStorage.setItem("qa","1"); localStorage.setItem("rd.cart.v1", ${JSON.stringify(cart)}); localStorage.setItem("rd.seen","1"); } } catch {}`;

  for (const vp of ["mobile-390", "mobile-375", "desktop-1440", "tablette-768"] as VP[]) {
    const ctx = await browser.newContext(ctxOpts(vp));
    await ctx.addInitScript(returning);
    const p = await ctx.newPage();
    await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
    const card = p.locator('[role="dialog"][aria-modal="false"]');
    await card.waitFor({ timeout: 6000 });
    assert.ok((await card.innerText()).includes("24,95"), "real cart total shown");
    assert.equal(await openDialogs(p), 0, "welcome pop-up is not stacked on top");
    await p.waitForTimeout(300);
    await shot(p, `${vp}-08-rappel-panier`);
    if (vp === "mobile-390") {
      await card.getByRole("button", { name: "Voir mon panier" }).click();
      await p.waitForTimeout(500);
      assert.equal(await p.locator('[aria-labelledby="cart-title"]').count(), 1, "opens the cart drawer");
      assert.equal(await card.count(), 0);
      ok("rappel panier : vrais articles et total, « Voir mon panier » ouvre le tiroir");
    }
    await ctx.close();
  }

  // First visit with a cart (same session) → no reminder.
  const ctx = await browser.newContext(ctxOpts("desktop-1440"));
  await ctx.addInitScript(`try { localStorage.setItem("rd.cart.v1", ${JSON.stringify(cart)}); localStorage.setItem("rd.popup.welcome", String(Date.now())); } catch {}`);
  const p = await ctx.newPage();
  await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await p.waitForTimeout(4500);
  assert.equal(await p.locator('[role="dialog"][aria-modal="false"]').count(), 0, "no reminder during the visit that filled the cart");
  ok("rappel panier : uniquement lors d'une visite ultérieure");
  await ctx.close();
}

async function admin(browser: Browser) {
  for (const vp of ["desktop-1440", "mobile-390"] as VP[]) {
    const ctx = await browser.newContext(ctxOpts(vp));
    const p = await ctx.newPage();
    await p.goto(`${BASE}/admin/login`);
    await p.fill('input[type="email"]', process.env.SEED_ADMIN_EMAIL!);
    await p.fill('input[type="password"]', process.env.SEED_ADMIN_PASSWORD!);
    await p.click('button[type="submit"]');
    await p.waitForURL(`${BASE}/admin`);
    await p.goto(`${BASE}/admin/avis?statut=all`, { waitUntil: "networkidle" });
    await shot(p, `${vp}-09-admin-avis`, true);
    await p.goto(`${BASE}/admin/promotions`, { waitUntil: "networkidle" });
    assert.ok(await timerFits(p), `${vp}: admin countdown preview overflows`);
    await shot(p, `${vp}-10-admin-promotions`, true);
    await ctx.close();
  }
  ok("admin : modération des avis et page Promotions capturées");
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const home = await fetch(`${BASE}/`).then((r) => r.text());
  if (!home.includes("Démo — Offre de lancement")) {
    console.error("✗ Le serveur ne tourne pas sur la base de démo (voir l'en-tête du script).");
    process.exit(1);
  }
  const browser = await chromium.launch({ channel: "chrome" });
  try {
    await storefront(browser);
    await inBetweenWidths(browser);
    await countdownTicks(browser);
    await welcome(browser);
    await exitIntent(browser);
    await cartReminder(browser);
    await admin(browser);
  } finally {
    await browser.close();
  }
  console.log(`\n${results.length} vérifications navigateur réussies.`);
}

main().catch((e) => {
  console.error("✗", e);
  process.exit(1);
});
