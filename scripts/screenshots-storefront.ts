/**
 * Storefront capture + UX audit in real Chrome (read-only: no order is placed).
 * Needs `npm run dev`. Used for the before/after comparison of the mobile-first redesign.
 *
 *   npx tsx scripts/screenshots-storefront.ts --out=before
 *   npx tsx scripts/screenshots-storefront.ts --out=after
 *
 * Output: docs/storefront-redesign/<out>/  (+ audit.json with overflow, small text, small tap targets)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium, type BrowserContextOptions, type Page } from "playwright-core";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3000";
const OUT_NAME = process.argv.find((a) => a.startsWith("--out="))?.split("=")[1] ?? "after";
const OUT = path.resolve("docs/storefront-redesign", OUT_NAME);
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.split("=")[1];
const QUIET = `(() => { try { const n = String(Date.now()); for (const k of ["welcome","exitIntent","cartReminder"]) localStorage.setItem("rd.popup." + k, n); localStorage.setItem("rd.seen","1"); } catch {} })()`;
const SLUG = "veste-bresil-vert";
const WIDTHS = [320, 375, 390, 414, 768, 1024, 1440];

const vp = (w: number): BrowserContextOptions => {
  const mobile = w < 768;
  return {
    viewport: { width: w, height: mobile ? (w <= 375 ? 667 : 844) : w === 768 ? 1024 : w === 1024 ? 768 : 900 },
    deviceScaleFactor: mobile ? 2 : 1,
    isMobile: mobile,
    hasTouch: mobile,
    reducedMotion: "reduce",
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
  };
};

const AUDIT = `(() => {
  const vw = document.documentElement.clientWidth;
  const overflow = document.documentElement.scrollWidth > vw + 1;
  const visible = (el) => { const b = el.getBoundingClientRect(); const s = getComputedStyle(el); return b.width > 0 && b.height > 0 && s.visibility !== "hidden" && s.display !== "none" && !el.closest("[aria-hidden=true], .sr-only, dialog:not([open])"); };
  const tiny = new Set();
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (w.nextNode()) { const n = w.currentNode, el = n.parentElement; if (!el || !n.textContent.trim() || !visible(el)) continue; const fs = parseFloat(getComputedStyle(el).fontSize); if (fs < 12) tiny.add(fs + "px: " + n.textContent.trim().slice(0, 28)); }
  const small = [...document.querySelectorAll("a[href], button, label, input, select, summary, [role=button], [role=radio]")].filter(visible).filter((el) => { const b = el.getBoundingClientRect(); return (b.height < 40 || b.width < 40) && !(el.tagName === "INPUT" && (el.type === "radio" || el.type === "checkbox")); }).map((el) => { const b = el.getBoundingClientRect(); return Math.round(b.width) + "x" + Math.round(b.height) + " " + (el.textContent || el.getAttribute("aria-label") || el.tagName).trim().replace(/\\s+/g, " ").slice(0, 24); });
  const h = document.body.scrollHeight;
  return { overflow, scrollWidth: document.documentElement.scrollWidth, tiny: [...tiny].slice(0, 12), tinyCount: tiny.size, smallTargets: small.slice(0, 12), smallCount: small.length, height: h };
})()`;

type Shot = { name: string; path: string; prepare?: (p: Page) => Promise<void>; full?: boolean; widths?: number[] };

async function addToCart(p: Page, pack = false) {
  await p.goto(`${BASE}/produit/${SLUG}${pack ? "?offre=pack" : ""}`, { waitUntil: "networkidle" });
  if (pack) {
    await p.locator('input[name="size-0"][value="M"]').check({ force: true });
    await p.locator('input[name="size-1"][value="L"]').check({ force: true });
  } else {
    await p.locator('input[name="size"][value="M"]').check({ force: true });
  }
  await p.getByRole("button", { name: /^Ajouter (au panier|le pack)/ }).first().click();
  await p.waitForSelector('[aria-labelledby="cart-title"]');
  await p.waitForTimeout(500);
}

const SHOTS: Shot[] = [
  { name: "accueil", path: "/", full: true },
  { name: "produit", path: `/produit/${SLUG}`, full: true },
  { name: "produit-pack", path: `/produit/${SLUG}?offre=pack`, widths: [390, 1440], prepare: async (p) => { await p.evaluate(`document.querySelector("#acheter")?.scrollIntoView({ block: "start" })`); await p.waitForTimeout(300); } },
  { name: "produit-selection", path: `/produit/${SLUG}`, widths: [390], prepare: async (p) => { await p.locator('input[name="size"][value="M"]').check({ force: true }); await p.evaluate(`document.querySelector("#field-single")?.scrollIntoView({ block: "center" })`); await p.waitForTimeout(300); } },
  { name: "produit-achat", path: `/produit/${SLUG}`, widths: [390], prepare: async (p) => { await p.evaluate(`(() => { const b = [...document.querySelectorAll("main button")].find((x) => /Ajouter au panier/.test(x.textContent)); b?.scrollIntoView({ block: "start" }); scrollBy(0, -120); })()`); await p.waitForTimeout(300); } },
  { name: "produit-avis", path: `/produit/${SLUG}`, widths: [390], prepare: async (p) => { await p.evaluate(`document.querySelector("#avis")?.scrollIntoView({ block: "start" })`); await p.waitForTimeout(400); } },
  { name: "tiroir-panier", path: "", widths: [390, 1440], prepare: async (p) => addToCart(p, true) },
  { name: "panier", path: "", widths: [390, 1440], full: true, prepare: async (p) => { await addToCart(p, true); await p.goto(`${BASE}/panier`, { waitUntil: "networkidle" }); } },
  { name: "commande", path: "", widths: [390, 1440], full: true, prepare: async (p) => { await addToCart(p); await p.goto(`${BASE}/commande`, { waitUntil: "networkidle" }); } },
  { name: "livraison-retours", path: "/livraison-retours", full: true, widths: [390, 1440] },
  { name: "retours-remboursements", path: "/retours-remboursements", full: true, widths: [390, 1440] },
  { name: "faq-contact", path: "/", widths: [390], prepare: async (p) => { await p.evaluate(`document.querySelector("#faq")?.scrollIntoView({ block: "start" })`); await p.waitForTimeout(400); } },
  { name: "menu-mobile", path: "/", widths: [390], prepare: async (p) => { await p.getByRole("button", { name: /menu/i }).first().click(); await p.waitForTimeout(500); } },
];

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: "chrome" });
  const audit: Record<string, unknown> = {};
  try {
    for (const s of SHOTS) {
      if (ONLY && !s.name.includes(ONLY)) continue;
      for (const w of s.widths ?? WIDTHS) {
        const ctx = await browser.newContext(vp(w));
        await ctx.addInitScript(QUIET);
        const p = await ctx.newPage();
        const errors: string[] = [];
        p.on("pageerror", (e) => errors.push(e.message));
        try {
          if (s.path) {
            const res = await p.goto(`${BASE}${s.path}`, { waitUntil: "networkidle" });
            if (res && res.status() >= 400) { audit[`${s.name}@${w}`] = { status: res.status() }; console.log(`  – ${s.name}@${w}: HTTP ${res.status()}`); await ctx.close(); continue; }
          }
          if (s.prepare) await s.prepare(p);
          await p.waitForTimeout(250);
          const a = await p.evaluate(AUDIT);
          audit[`${s.name}@${w}`] = { ...(a as object), errors };
          const base = `${w < 768 ? "mobile" : "desktop"}-${w}-${s.name}`;
          await p.screenshot({ path: path.join(OUT, `${base}.jpg`), type: "jpeg", quality: 80 });
          if (s.full && (w === 390 || w === 1440)) {
            await p.evaluate(`(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { scrollTo(0, y); await new Promise(r => setTimeout(r, 50)); } scrollTo(0, 0); })()`);
            await p.waitForTimeout(400);
            await p.screenshot({ path: path.join(OUT, `${base}-complet.jpg`), type: "jpeg", quality: 68, fullPage: true });
          }
          const r = a as { overflow: boolean; tinyCount: number; smallCount: number };
          console.log(`  ${r.overflow ? "✗" : "✓"} ${s.name}@${w} overflow=${r.overflow} tiny=${r.tinyCount} smallTargets=${r.smallCount}${errors.length ? " JS:" + errors.length : ""}`);
        } catch (e) {
          audit[`${s.name}@${w}`] = { error: (e as Error).message.slice(0, 200) };
          console.log(`  ! ${s.name}@${w}: ${(e as Error).message.slice(0, 120)}`);
        }
        await ctx.close();
      }
    }
  } finally {
    await browser.close();
  }
  writeFileSync(path.join(OUT, "audit.json"), JSON.stringify(audit, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
