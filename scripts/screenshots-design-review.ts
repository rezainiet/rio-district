/**
 * Product-page design review: real-Chrome screenshots + interaction QA of the
 * three concepts (/design-review/product-0X). Needs `npm run dev`.
 *
 *   npx tsx scripts/screenshots-design-review.ts            → screenshots + checks
 *   npx tsx scripts/screenshots-design-review.ts --qa-only  → checks only
 *
 * Output: docs/design-review/screenshots/ and docs/design-review/qa.json
 */
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium, type Browser, type BrowserContextOptions, type Page } from "playwright-core";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3000";
const OUT = path.resolve("docs/design-review/screenshots");
const QA_ONLY = process.argv.includes("--qa-only");
const ONLY = process.argv.find((a) => a.startsWith("--concept="))?.split("=")[1];
const CONCEPTS = ["product-01", "product-02", "product-03"].filter((c) => !ONLY || c.endsWith(ONLY));
const SLUG = "veste-bresil-vert";
const QUIET = `(() => { try { const n = String(Date.now()); for (const k of ["welcome","exitIntent","cartReminder"]) localStorage.setItem("rd.popup." + k, n); localStorage.setItem("rd.seen","1"); localStorage.removeItem("rd.cart.v1"); } catch {} })()`;

const vp = (w: number): BrowserContextOptions => {
  const mobile = w < 768;
  return {
    viewport: { width: w, height: mobile ? (w === 375 ? 667 : 844) : w === 768 ? 1024 : 900 },
    deviceScaleFactor: mobile ? 2 : 1,
    isMobile: mobile,
    hasTouch: mobile,
    reducedMotion: "reduce",
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
  };
};

const results: Record<string, unknown>[] = [];
const ok = (msg: string, extra: Record<string, unknown> = {}) => {
  results.push({ ok: true, msg, ...extra });
  console.log(`  ✓ ${msg}`);
};

async function shot(p: Page, name: string, opts: { full?: boolean; clip?: { x: number; y: number; width: number; height: number } } = {}) {
  if (QA_ONLY) return;
  if (opts.full) {
    await p.evaluate(`(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); } scrollTo(0, 0); })()`);
    await p.waitForTimeout(500);
  }
  await p.screenshot({ path: path.join(OUT, `${name}.jpg`), type: "jpeg", quality: opts.full ? 72 : 85, fullPage: opts.full, clip: opts.clip });
  console.log(`    → ${name}.jpg`);
}

/** Layout checks run at every width. */
async function layoutChecks(p: Page, label: string) {
  const r = (await p.evaluate(`(() => {
    const vw = document.documentElement.clientWidth;
    const overflowX = document.documentElement.scrollWidth > vw + 1;
    const wide = [...document.querySelectorAll("main *")].filter((el) => {
      const b = el.getBoundingClientRect();
      if (b.width === 0 || b.height === 0) return false;
      const cs = getComputedStyle(el);
      if (cs.position === "fixed") return false;
      let a = el.parentElement, clipped = false;
      while (a && a !== document.body) { const s = getComputedStyle(a); if (s.overflowX !== "visible" || s.overflow === "hidden" || s.overflow === "clip") { clipped = true; break; } a = a.parentElement; }
      return !clipped && (b.right > vw + 1 || b.left < -1);
    }).slice(0, 5).map((el) => el.tagName + "." + String(el.className).slice(0, 60));
    const footerWide = [...document.querySelectorAll("footer *")].some((el) => el.getBoundingClientRect().right > vw + 1);
    const headings = [...document.querySelectorAll("main h1, main h2, main h3")].filter((h) => h.scrollWidth > h.clientWidth + 1).map((h) => h.textContent.slice(0, 40));
    // Readable text: any visible text node rendered under 11px.
    const tiny = [];
    const walker = document.createTreeWalker(document.querySelector("main"), NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const n = walker.currentNode; const el = n.parentElement;
      if (!n.textContent.trim() || !el) continue;
      const b = el.getBoundingClientRect(); if (b.width === 0) continue;
      const cs = getComputedStyle(el); if (cs.visibility === "hidden" || cs.display === "none") continue;
      if (el.closest(".sr-only, [aria-hidden=true]")) continue;
      if (parseFloat(cs.fontSize) < 11) tiny.push(n.textContent.trim().slice(0, 30) + " (" + cs.fontSize + ")");
    }
    // Touch targets: interactive controls smaller than 40px tall in the purchase zone.
    const small = [...document.querySelectorAll("#acheter button, #acheter a, #acheter label")].filter((el) => { const b = el.getBoundingClientRect(); return b.height > 0 && b.height < 40 && b.width < 40; }).map((el) => (el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 20));
    return { overflowX, footerWide, wide, headings, tiny: tiny.slice(0, 8), small: small.slice(0, 8) };
  })()`)) as { overflowX: boolean; footerWide: boolean; wide: string[]; headings: string[]; tiny: string[]; small: string[] };
  // The shared store footer overflows by a few px at 768 on the LIVE site too (reported separately, not part of the concepts).
  assert.ok(!r.overflowX || (r.wide.length === 0 && r.footerWide), `${label}: horizontal scroll (${r.wide.join(", ")})`);
  assert.deepEqual(r.wide, [], `${label}: content wider than the screen (${r.wide.join(", ")})`);
  if (r.overflowX) ok(`${label}: ⚠ débordement horizontal causé par le pied de page existant (même défaut sur la fiche en ligne)`, { footerOverflow: true });
  assert.deepEqual(r.headings, [], `${label}: heading overflow`);
  assert.deepEqual(r.tiny, [], `${label}: text under 11px`);
  return r;
}

/** Sticky bar: hidden over the purchase controls, visible after them, never covering a control. */
async function stickyChecks(p: Page, label: string) {
  const bar = p.locator("[data-sticky-bar]");
  // Over the options/button zone the bar must be hidden.
  await p.evaluate(`document.querySelector("#field-single, #field-slot0")?.scrollIntoView({ block: "center" })`);
  await p.waitForTimeout(500);
  const overZone = await bar.evaluate((el) => el.getAttribute("aria-hidden"));
  assert.equal(overZone, "true", `${label}: sticky bar visible over the size picker`);
  // Below the zone (reviews), it must appear.
  await p.evaluate(`document.querySelector("#avis")?.scrollIntoView({ block: "start" })`);
  await p.waitForTimeout(600);
  assert.equal(await bar.evaluate((el) => el.getAttribute("aria-hidden")), "false", `${label}: sticky bar missing after the CTA`);
  const geo = (await p.evaluate(`(() => { const b = document.querySelector("[data-sticky-bar]").getBoundingClientRect(); return { top: b.top, bottom: b.bottom, h: b.height, vh: innerHeight }; })()`)) as { top: number; bottom: number; h: number; vh: number };
  assert.ok(Math.abs(geo.bottom - geo.vh) < 2 && geo.h <= 96, `${label}: sticky bar geometry ${JSON.stringify(geo)}`);
  // Only one fixed bottom bar.
  const fixedBottoms = (await p.evaluate(`[...document.querySelectorAll("body *")].filter((e) => { const s = getComputedStyle(e); const b = e.getBoundingClientRect(); return s.position === "fixed" && b.height > 0 && b.bottom >= innerHeight - 2 && b.top > innerHeight / 2 && s.transform === "none"; }).length`)) as number;
  assert.ok(fixedBottoms <= 1, `${label}: ${fixedBottoms} bottom bars`);
  // With no size: the bar's button scrolls to the size picker (no default size is added).
  const btn = bar.getByRole("button");
  assert.match((await btn.innerText()).trim(), /Choisir ma taille/i);
  await btn.click();
  await p.waitForTimeout(900);
  const sizeInView = (await p.evaluate(`(() => { const b = document.querySelector("#field-single, #field-slot0").getBoundingClientRect(); return b.top >= 0 && b.bottom <= innerHeight; })()`)) as boolean;
  assert.ok(sizeInView, `${label}: "Choisir ma taille" did not bring the size picker into view`);
  ok(`${label}: barre collante masquée sur les options, visible après, « Choisir ma taille » ramène au sélecteur`);
}

async function concept(browser: Browser, key: string) {
  const short = key.replace("product-", "c");
  for (const w of [375, 390, 768, 1440]) {
    const ctx = await browser.newContext(vp(w));
    await ctx.addInitScript(QUIET);
    const p = await ctx.newPage();
    const errors: string[] = [];
    p.on("pageerror", (e) => errors.push(e.message));
    p.on("console", (m) => m.type() === "error" && !/favicon|Failed to load resource/.test(m.text()) && errors.push(m.text()));
    const mobile = w < 768;
    const label = `${key} @${w}`;

    // ---- Demo mode (all components visible, samples tagged) ----
    await p.goto(`${BASE}/design-review/${key}/${SLUG}?demo=1`, { waitUntil: "networkidle" });
    await p.waitForTimeout(400);
    const lay = await layoutChecks(p, label);
    const first = (await p.evaluate(`(() => {
      const seen = (sel) => { const e = document.querySelector(sel); if (!e) return false; const b = e.getBoundingClientRect(); return b.top >= 0 && b.bottom <= innerHeight; };
      return { h1: seen("main h1"), rating: seen('main a[href="#avis"]'), price: seen("main .price"), stock: seen('main [role="status"]') };
    })()`)) as Record<string, boolean>;
    ok(`${label}: pas de défilement horizontal, titres OK, aucun texte < 11 px · 1er écran ${JSON.stringify(first)}${lay.small.length ? ` · petites cibles: ${lay.small.join("|")}` : ""}`, { key, w, first, small: lay.small });

    if (w === 390) {
      await shot(p, `${short}-mobile-390-1-premier-ecran`);
      await shot(p, `${short}-mobile-390-0-page-complete`, { full: true });
      // Purchase selector close-up (pack selected to show both jackets).
      await p.locator("#acheter").scrollIntoViewIfNeeded();
      await p.evaluate(`window.scrollTo(0, document.querySelector("#acheter").getBoundingClientRect().top + scrollY - 70)`);
      await p.waitForTimeout(300);
      await shot(p, `${short}-mobile-390-2-selecteur-achat`);
      // Trust / reassurance area.
      await p.evaluate(`(() => { const el = [...document.querySelectorAll("main ul, main ol")].find((u) => /Rien à payer|Retour possible sous/.test(u.textContent) && u.getBoundingClientRect().height > 120) || document.querySelector("main ol[aria-label]"); window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 150); })()`);
      await p.waitForTimeout(500);
      await shot(p, `${short}-mobile-390-3-confiance`);
      await p.evaluate(`window.scrollTo(0, document.querySelector("#avis").getBoundingClientRect().top + scrollY - 70)`);
      await p.waitForTimeout(500);
      await shot(p, `${short}-mobile-390-4-avis`);
    }
    if (w === 1440) {
      await shot(p, `${short}-desktop-1440-1-premier-ecran`);
      await shot(p, `${short}-desktop-1440-0-page-complete`, { full: true });
      const box = (await p.evaluate(`(() => { const z = document.querySelector("#acheter"); z.scrollIntoView({ block: "start" }); scrollBy(0, -140); const b = z.getBoundingClientRect(); return { x: Math.max(0, b.left - 24), y: Math.max(0, b.top - 120), width: Math.min(innerWidth, b.width + 48) }; })()`)) as { x: number; y: number; width: number };
      await p.waitForTimeout(400);
      await shot(p, `${short}-desktop-1440-2-achat-confiance`, { clip: { x: box.x, y: box.y, width: box.width, height: 900 - box.y } });
    }

    // ---- Interactions ----
    if (mobile) await stickyChecks(p, label);

    // Rating link scrolls to the reviews.
    await p.goto(`${BASE}/design-review/${key}/${SLUG}?demo=1`, { waitUntil: "networkidle" });
    await p.locator('main a[href="#avis"]:visible').first().click();
    await p.waitForTimeout(900);
    const avisTop = (await p.evaluate(`document.querySelector("#avis").getBoundingClientRect().top`)) as number;
    assert.ok(avisTop >= -5 && avisTop < 400, `${label}: rating link did not scroll to reviews (${avisTop})`);

    // Single: size → add → drawer shows 19,99.
    await p.locator('input[name="size"][value="M"]').check({ force: true });
    await p.waitForTimeout(200);
    const stockMsg = await p.locator("#field-single [role=status]").innerText();
    await p.locator("#acheter").getByRole("button", { name: /Ajouter au panier/ }).click();
    await p.waitForSelector('[aria-labelledby="cart-title"]');
    await p.waitForTimeout(500);
    const drawer = await p.locator('[aria-labelledby="cart-title"]').innerText();
    assert.ok(drawer.includes("19,99"), `${label}: single price in drawer`);
    await p.keyboard.press("Escape");
    await p.evaluate(`localStorage.removeItem("rd.cart.v1")`);

    // Pack: both sizes required, then 24,95 in the drawer.
    await p.goto(`${BASE}/design-review/${key}/${SLUG}?demo=1&offre=pack`, { waitUntil: "networkidle" });
    const packText = await p.locator("#acheter").innerText();
    assert.ok(/24,95/.test(packText) && /39,98/.test(packText) && /15,03/.test(packText) && /38/.test(packText), `${label}: pack prices (24,95 / 39,98 / 15,03 / −38 %)`);
    await p.locator("#acheter").getByRole("button", { name: /Ajouter le pack/ }).click();
    await p.waitForTimeout(700);
    assert.ok(await p.locator("#field-slot0 [role=alert]").isVisible(), `${label}: missing size error`);
    await p.locator('input[name="size-0"][value="M"]').check({ force: true });
    await p.locator('input[name="size-1"][value="L"]').check({ force: true });
    await p.locator("#acheter").getByRole("button", { name: /Ajouter le pack/ }).click();
    await p.waitForSelector('[aria-labelledby="cart-title"]');
    await p.waitForTimeout(500);
    assert.ok((await p.locator('[aria-labelledby="cart-title"]').innerText()).includes("24,95"), `${label}: pack price in drawer`);
    await p.keyboard.press("Escape");
    await p.evaluate(`localStorage.removeItem("rd.cart.v1")`);
    if (w === 390) {
      await p.goto(`${BASE}/design-review/${key}/${SLUG}?demo=1&offre=pack`, { waitUntil: "networkidle" });
      await p.evaluate(`window.scrollTo(0, document.querySelector("#acheter").getBoundingClientRect().top + scrollY - 70)`);
      await p.waitForTimeout(300);
      await shot(p, `${short}-mobile-390-5-pack`);
    }
    ok(`${label}: note → avis, taille M (${stockMsg.trim()}) → panier 19,99 €, pack sans taille refusé puis 24,95 €`);

    // Countdown: same deadline after a reload (no reset), and absent in real-data mode.
    if (w === 390) {
      await p.goto(`${BASE}/design-review/${key}/${SLUG}?demo=1`, { waitUntil: "networkidle" });
      const t1 = await p.locator('[role="timer"]').first().getAttribute("aria-label");
      await p.reload({ waitUntil: "networkidle" });
      const t2 = await p.locator('[role="timer"]').first().getAttribute("aria-label");
      assert.equal(t1, t2, `${label}: countdown deadline changed on reload`);
      await p.goto(`${BASE}/design-review/${key}/${SLUG}`, { waitUntil: "networkidle" });
      assert.equal(await p.locator('[role="timer"]').count(), 0, `${label}: countdown shown without a real campaign`);
      const realText = await p.locator("main").innerText();
      assert.ok(!/stock simulé|campagne fictive/i.test(realText), `${label}: sample tags in real-data mode`);
      assert.ok(!/Plus que \d+ article/.test(realText), `${label}: quantity shown without tracked stock`);
      assert.ok(!/sécurisé|crypté/i.test(realText), `${label}: payment security claim without a provider`);
      const pageText = await p.locator("body").innerText();
      assert.ok(!/14 jours/.test(pageText) && /15 jours/.test(realText), `${label}: return period must be 15 days everywhere (page, bandeau, pied de page)`);
      await shot(p, `${short}-mobile-390-6-donnees-reelles`);
      ok(`${label}: compte à rebours stable au rechargement (${t1}), absent sans campagne réelle ; aucune fausse quantité/paiement ; 15 jours partout`);
    }

    assert.deepEqual(errors, [], `${label}: JS errors ${errors.join(" | ")}`);
    await ctx.close();
  }
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: "chrome" });
  try {
    for (const key of CONCEPTS) {
      console.log(`● ${key}`);
      await concept(browser, key);
    }
    // Returns page + comparison.
    for (const w of [390, 1440]) {
      const ctx = await browser.newContext(vp(w));
      await ctx.addInitScript(QUIET);
      const p = await ctx.newPage();
      await p.goto(`${BASE}/design-review/retours`, { waitUntil: "networkidle" });
      await layoutChecks(p, `retours @${w}`);
      await shot(p, `retours-${w === 390 ? "mobile-390" : "desktop-1440"}`, { full: true });
      const footer = await p.locator("footer").innerText();
      assert.ok(/Retours & remboursements/.test(footer), "footer link to the returns page");
      await ctx.close();
    }
    ok("page Retours & remboursements : lisible à 390 et 1440 px, liée depuis le pied de page");
  } finally {
    await browser.close();
  }
  writeFileSync(path.resolve("docs/design-review/qa.json"), JSON.stringify(results, null, 2));
  console.log("✓ terminé");
}

main().catch((e) => {
  console.error("✗", e.message ?? e);
  process.exit(1);
});
