/**
 * Renders each concept mockup to images with the local Chrome:
 *   output/<concept>-desktop.jpg  — 1440 px wide, full page
 *   output/<concept>-mobile.jpg   — 390 px wide, first 1.9 screens (hero + start of the lineup)
 *
 *   npx tsx design-concepts/render.ts [only-substring]
 */
import { mkdirSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright-core";

const ROOT = path.resolve("design-concepts");
const OUT = path.join(ROOT, "output");
const only = process.argv[2];

async function main() {
  mkdirSync(OUT, { recursive: true });
  const concepts = readdirSync(ROOT).filter((d) => /^\d\d-/.test(d) && statSync(path.join(ROOT, d)).isDirectory());
  const browser = await chromium.launch({ channel: "chrome" });
  try {
    for (const c of concepts) {
      if (only && !c.includes(only)) continue;
      const url = pathToFileURL(path.join(ROOT, c, "index.html")).href;

      const desk = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await desk.goto(url, { waitUntil: "networkidle" });
      await desk.evaluate(() => document.fonts.ready);
      await desk.waitForTimeout(400);
      await desk.screenshot({ path: path.join(OUT, `${c}-desktop.jpg`), fullPage: true, type: "jpeg", quality: 86 });
      await desk.close();

      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
      const mob = await ctx.newPage();
      await mob.goto(url, { waitUntil: "networkidle" });
      await mob.evaluate(() => document.fonts.ready);
      await mob.waitForTimeout(400);
      const h = await mob.evaluate(() => document.documentElement.scrollHeight);
      await mob.screenshot({
        path: path.join(OUT, `${c}-mobile.jpg`),
        fullPage: true,
        clip: { x: 0, y: 0, width: 390, height: Math.min(h, 1600) },
        type: "jpeg",
        quality: 86,
      });
      await ctx.close();
      console.log("  ✓", c);
    }
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
