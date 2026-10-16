/**
 * Reference-store audit capture (read-only: no cart, no order).
 * Full-page screenshots at 390 / 1440 px, visible text, fixed/sticky elements.
 *
 *   npx tsx scripts/audit-reference.ts   → docs/design-review/reference/
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium, type BrowserContextOptions, type Page } from "playwright-core";

const OUT = path.resolve("docs/design-review/reference");
const PAGES = [
  ["accueil", "https://www.kaltshop.club/"],
  ["veste-vert", "https://www.kaltshop.club/produit/veste-bresil-vert"],
  ["veste-noir", "https://www.kaltshop.club/produit/veste-bresil-noir"],
] as const;
const VP = {
  "desktop-1440": { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  "mobile-390": { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
} satisfies Record<string, BrowserContextOptions>;

async function scrollThrough(p: Page) {
  await p.evaluate(`(async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); } scrollTo(0, 0); })()`);
  await p.waitForTimeout(800);
}

const INSPECT = `(() => {
  const out = { fixed: [], headings: [], buttons: [], links: [], imgs: 0, videos: 0, iframes: [] };
  for (const el of document.querySelectorAll("body *")) {
    const cs = getComputedStyle(el);
    if ((cs.position === "fixed" || cs.position === "sticky") && el.getBoundingClientRect().height > 0) {
      const r = el.getBoundingClientRect();
      out.fixed.push({ tag: el.tagName, pos: cs.position, top: Math.round(r.top), h: Math.round(r.height), w: Math.round(r.width), text: el.innerText.slice(0, 160).replace(/\s+/g, " ") });
    }
  }
  out.headings = [...document.querySelectorAll("h1,h2,h3")].map(h => h.tagName + " " + h.innerText.replace(/\s+/g, " ").slice(0, 120));
  out.buttons = [...new Set([...document.querySelectorAll("button, [role=button]")].map(b => (b.innerText || b.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim()).filter(Boolean))].slice(0, 120);
  out.links = [...new Set([...document.querySelectorAll("a[href]")].map(a => a.innerText.replace(/\s+/g, " ").trim() + " → " + a.getAttribute("href")))].slice(0, 120);
  out.imgs = document.querySelectorAll("img").length;
  out.videos = document.querySelectorAll("video").length;
  out.iframes = [...document.querySelectorAll("iframe")].map(f => f.src);
  out.height = document.body.scrollHeight;
  return out;
})()`;

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: "chrome" });
  const report: Record<string, unknown> = {};
  try {
    for (const [vpName, vp] of Object.entries(VP)) {
      const ctx = await browser.newContext({ ...vp, locale: "fr-FR", timezoneId: "Europe/Paris" });
      const p = await ctx.newPage();
      for (const [name, url] of PAGES) {
        await p.goto(url, { waitUntil: "networkidle", timeout: 60000 }).catch(() => {});
        await p.waitForTimeout(2500);
        await p.screenshot({ path: path.join(OUT, `${vpName}-${name}-0-premier-ecran.jpg`), type: "jpeg", quality: 80 });
        await scrollThrough(p);
        await p.screenshot({ path: path.join(OUT, `${vpName}-${name}-1-page-complete.jpg`), type: "jpeg", quality: 70, fullPage: true });
        const text = await p.evaluate(`document.body.innerText`);
        writeFileSync(path.join(OUT, `${vpName}-${name}.txt`), String(text));
        // Fixed elements after a real scroll (sticky CTA appears mid-page).
        await p.evaluate(`scrollTo(0, 1600)`);
        await p.waitForTimeout(900);
        const inspect = await p.evaluate(INSPECT);
        await p.screenshot({ path: path.join(OUT, `${vpName}-${name}-2-apres-defilement.jpg`), type: "jpeg", quality: 80 });
        report[`${vpName}/${name}`] = inspect;
        console.log(`✓ ${vpName} ${name}`);
      }
      await ctx.close();
    }
  } finally {
    await browser.close();
  }
  writeFileSync(path.join(OUT, "inspect.json"), JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
