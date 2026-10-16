/**
 * Real-browser mobile interaction audit (local Chrome via playwright-core).
 * Requires `npm run dev`. Read-only: it never submits a form.
 *
 *   npm run qa:mobile
 *
 * Checks, at 375 and 390 px:
 *  - sticky add-to-cart bar visibility while scrolling, and overlap with the
 *    title, price, offer cards, colour/size options and main CTA
 *  - layout shift when opening the mobile menu and the cart drawer
 *  - tap targets smaller than 44×44 px
 *  - rendered text smaller than 12 px
 */
import { chromium, type Page } from "playwright-core";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3000";
type Rect = { top: number; bottom: number; left: number; right: number; height: number; width: number };

async function rect(page: Page, selector: string): Promise<Rect | null> {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, height: r.height, width: r.width };
  }, selector);
}

const domClick = (page: Page, sel: string) => page.evaluate((s) => (document.querySelector(s) as HTMLElement).click(), sel);

const overlaps = (a: Rect, b: Rect) => a.top < b.bottom - 1 && b.top < a.bottom - 1;

async function stickyAudit(page: Page, label: string) {
  const issues: string[] = [];
  let shownAt: number | null = null;
  const total = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  const vh = await page.evaluate(() => innerHeight);
  for (let y = 0; y <= total; y += 120) {
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await page.waitForTimeout(380); // > bar transition (300 ms)
    const bar = await rect(page, "div.fixed.inset-x-0.bottom-0.z-30");
    if (!bar) continue;
    const visible = bar.top < vh - 2;
    const cta = await rect(page, "#acheter > div[class*='mt-8'] button, #acheter button.ui-btn");
    if (visible && shownAt === null) shownAt = y;
    if (!visible) continue;
    for (const [name, sel] of [
      ["titre", "#acheter h1"],
      ["prix", "#acheter .price"],
      ["offres", "#acheter fieldset"],
      ["tailles", "#field-single, #field-slot0, #field-slot1"],
      ["CTA principal", "#acheter div.mt-8 > button"],
    ] as const) {
      const r = await rect(page, sel);
      if (r && r.bottom > 0 && r.top < vh && overlaps(bar, r)) issues.push(`${label}: barre visible sur « ${name} » à y=${y}`);
    }
    if (cta && cta.bottom > 0 && cta.top < vh) issues.push(`${label}: barre et CTA principal visibles ensemble à y=${y}`);
  }
  return { shownAt, issues: [...new Set(issues)] };
}

async function shiftAudit(page: Page, label: string, open: () => Promise<void>, close: () => Promise<void>) {
  await page.evaluate(() => window.scrollTo(0, 300));
  await page.waitForTimeout(300);
  const before = await page.evaluate(() => ({ y: scrollY, w: document.documentElement.clientWidth, h1: document.querySelector("main h1, main h2")?.getBoundingClientRect().left ?? 0 }));
  await open();
  await page.waitForTimeout(500);
  const during = await page.evaluate(() => ({ y: scrollY, w: document.documentElement.clientWidth, h1: document.querySelector("main h1, main h2")?.getBoundingClientRect().left ?? 0 }));
  await close();
  await page.waitForTimeout(500);
  const after = await page.evaluate(() => ({ y: scrollY }));
  const issues: string[] = [];
  if (Math.abs(during.w - before.w) > 0.5 || Math.abs(during.h1 - before.h1) > 0.5) issues.push(`${label}: décalage horizontal à l'ouverture (${before.w}→${during.w})`);
  if (Math.abs(after.y - before.y) > 2) issues.push(`${label}: position de défilement perdue (${before.y}→${after.y})`);
  return issues;
}

async function targetsAndText(page: Page) {
  return page.evaluate(() => {
    const small: string[] = [];
    const seen = new Set<string>();
    for (const el of Array.from(document.querySelectorAll("a, button, select, input:not([type=hidden]):not(.sr-only), summary, label:has(input[type=radio])")) as HTMLElement[]) {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      if (r.width === 0 || cs.visibility === "hidden" || el.closest("[hidden],[aria-hidden=true]")) continue;
      // Inline text links inside paragraphs are exempt (WCAG 2.5.8 inline exception).
      if (el.tagName === "A" && cs.display === "inline" && el.closest("p, li")) continue;
      if (r.height < 44 || r.width < 44) {
        const key = `${el.tagName} ${Math.round(r.width)}×${Math.round(r.height)} « ${(el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 28)} »`;
        if (!seen.has(key)) { seen.add(key); small.push(key); }
      }
    }
    const tiny = new Map<string, string>();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const t = walker.currentNode.textContent?.trim();
      const el = walker.currentNode.parentElement;
      if (!t || !el || el.closest("[hidden],[aria-hidden=true],.sr-only,script,style")) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0) continue;
      const fs = parseFloat(getComputedStyle(el).fontSize);
      if (fs < 12) tiny.set(`${fs}px « ${t.slice(0, 40)} »`, String(el.className).slice(0, 50));
    }
    return { small, tiny: [...tiny.entries()].map(([k, v]) => `${k}  (${v})`) };
  });
}

async function main() {
  const browser = await chromium.launch({ channel: "chrome" });
  const report: Record<string, unknown> = {};
  try {
    for (const width of [375, 390]) {
      const ctx = await browser.newContext({ viewport: { width, height: 812 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
      const page = await ctx.newPage();
      const r: Record<string, unknown> = {};

      await page.goto(`${BASE}/produit/veste-bresil-vert`, { waitUntil: "networkidle" });
      r.single = await stickyAudit(page, "veste seule");
      await page.goto(`${BASE}/produit/veste-bresil-vert?offre=pack`, { waitUntil: "networkidle" });
      r.bundle = await stickyAudit(page, "pack");

      await page.goto(`${BASE}/produit/veste-bresil-vert`, { waitUntil: "networkidle" });
      r.targetsProduct = await targetsAndText(page);
      r.menu = await shiftAudit(
        page,
        "menu",
        // DOM clicks: Playwright's own click scrolls sticky elements "into view", which would fake a scroll reset.
        () => domClick(page, '[aria-controls="mobile-menu"]'),
        () => domClick(page, '[aria-controls="mobile-menu"]'),
      );
      r.drawer = await shiftAudit(
        page,
        "panier",
        () => domClick(page, 'button[aria-label^="Ouvrir le panier"]'),
        () => domClick(page, 'button[aria-label="Fermer le panier"]'),
      );

      // Cart drawer with a bundle in it.
      await page.goto(`${BASE}/produit/veste-bresil-vert?offre=pack`, { waitUntil: "networkidle" });
      await page.locator('input[name="size-0"][value="M"]').check({ force: true });
      await page.locator('input[name="size-1"][value="L"]').check({ force: true });
      await domClick(page, "#acheter div.mt-8 > button");
      await page.waitForTimeout(600);
      r.targetsDrawer = await page.evaluate(() => {
        const d = document.querySelector('[aria-labelledby="cart-title"]');
        return Array.from(d?.querySelectorAll("a, button, select") ?? []).map((e) => { const r = e.getBoundingClientRect(); return `${e.tagName} ${Math.round(r.width)}×${Math.round(r.height)} « ${(e.textContent || e.getAttribute("aria-label") || "").trim().slice(0, 24)} »`; }).filter((t) => { const m = t.match(/ (d+)×(d+) /); return m && (+m[1] < 44 || +m[2] < 40); });
      });
      await page.evaluate(() => localStorage.removeItem("rd.cart.v1"));

      await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
      r.targetsHome = await targetsAndText(page);
      await page.goto(`${BASE}/commande`, { waitUntil: "networkidle" });
      r.targetsCheckout = await targetsAndText(page);

      report[`${width}px`] = r;
      await ctx.close();
    }
  } finally {
    await browser.close();
  }
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
