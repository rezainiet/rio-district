/**
 * Screenshots + quick functional check of the product-page concepts
 * (/concepts/...), real Chrome. Needs `npm run dev`.
 *
 *   npx tsx scripts/screenshots-concepts.ts      → docs/screenshots/concepts-fiche/
 */
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { chromium, type BrowserContextOptions, type Page } from "playwright-core";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3000";
const OUT = path.resolve("docs/screenshots/concepts-fiche");
const SLUG = "veste-bresil-vert";
const CONCEPTS = [
  ["a", "vitrine"],
  ["b", "confiance"],
  ["c", "pack"],
] as const;
const VP = {
  "desktop-1440": { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  "mobile-390": { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
} satisfies Record<string, BrowserContextOptions>;
const QUIET = `(() => { try { const n = String(Date.now()); for (const k of ["welcome","exitIntent","cartReminder"]) localStorage.setItem("rd.popup." + k, n); localStorage.setItem("rd.seen","1"); localStorage.removeItem("rd.cart.v1"); } catch {} })()`;

async function shot(p: Page, name: string, full = false) {
  if (full) {
    await p.evaluate(`(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { scrollTo(0, y); await new Promise(r => setTimeout(r, 70)); } scrollTo(0, 0); })()`);
    await p.waitForTimeout(400);
  }
  await p.screenshot({ path: path.join(OUT, `${name}.jpg`), type: "jpeg", quality: 82, fullPage: full });
  console.log(`  → ${name}.jpg`);
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: "chrome" });
  const errors: string[] = [];
  try {
    for (const [vpName, vp] of Object.entries(VP)) {
      const mobile = vpName.startsWith("mobile");
      const ctx = await browser.newContext({ ...vp, reducedMotion: "reduce", locale: "fr-FR", timezoneId: "Europe/Paris" });
      await ctx.addInitScript(QUIET);
      const p = await ctx.newPage();
      p.on("pageerror", (e) => errors.push(`${vpName}: ${e.message}`));

      // Current page, for comparison.
      await p.goto(`${BASE}/produit/${SLUG}`, { waitUntil: "networkidle" });
      await shot(p, `${vpName}-00-page-actuelle`);

      for (const [letter, key] of CONCEPTS) {
        const url = `${BASE}/concepts/${key}/${SLUG}`;
        await p.goto(url, { waitUntil: "networkidle" });
        assert.ok(await p.evaluate(`document.documentElement.scrollWidth <= innerWidth + 1 && [...document.querySelectorAll("h1, h2")].every((h) => h.scrollWidth <= h.clientWidth + 1)`), `${vpName} ${key}: horizontal overflow`);
        await shot(p, `${vpName}-${letter}-${key}-1-haut-de-page`);
        await shot(p, `${vpName}-${letter}-${key}-2-page-complete`, true);

        // Stock preview + buy area.
        await p.goto(`${url}?stock=3`, { waitUntil: "networkidle" });
        await p.locator('[role="status"]').first().scrollIntoViewIfNeeded();
        await p.evaluate(`scrollBy(0, ${mobile ? -260 : -220})`);
        await p.waitForTimeout(250);
        await shot(p, `${vpName}-${letter}-${key}-3-stock-limite`);

        // Functional check: choose size(s) and add to cart.
        await p.goto(url, { waitUntil: "networkidle" });
        const pack = key === "pack";
        if (pack) {
          await p.locator('input[name="size-0"][value="M"]').check({ force: true });
          await p.locator('input[name="size-1"][value="L"]').check({ force: true });
        } else {
          await p.locator('input[name="size"][value="M"]').check({ force: true });
        }
        if (mobile) {
          // Real scroll past the CTA: the sticky bar must appear.
          await p.evaluate(`(() => { const r = document.querySelector("#acheter").getBoundingClientRect(); scrollTo(0, r.bottom + scrollY - 200); })()`);
          await p.waitForTimeout(500);
          await shot(p, `${vpName}-${letter}-${key}-4-barre-collante`);
          await p.evaluate(`scrollTo(0, 0)`);
        }
        await p.locator("#acheter").getByRole("button", { name: /Ajouter (au panier|le pack)/ }).first().click();
        await p.waitForSelector('[aria-labelledby="cart-title"]');
        const drawer = await p.locator('[aria-labelledby="cart-title"]').innerText();
        assert.ok(drawer.includes(pack ? "24,95" : "19,99"), `${vpName} ${key}: cart total`);
        await p.keyboard.press("Escape");
        await p.evaluate(`localStorage.removeItem("rd.cart.v1")`);
        console.log(`  ✓ ${vpName} ${key}: pas de débordement, ajout au panier ${pack ? "pack 24,95 €" : "19,99 €"}`);
      }

      await p.goto(`${BASE}/concepts/retours`, { waitUntil: "networkidle" });
      assert.ok(await p.evaluate(`document.documentElement.scrollWidth <= innerWidth + 1 && [...document.querySelectorAll("h1")].every((h) => h.scrollWidth <= h.clientWidth + 1)`), `${vpName} retours: overflow`);
      await shot(p, `${vpName}-r-retours-remboursements`, true);
      if (!mobile) {
        await p.goto(`${BASE}/concepts`, { waitUntil: "networkidle" });
        await shot(p, `${vpName}-index-concepts`);
      }
      await ctx.close();
    }
  } finally {
    await browser.close();
  }
  assert.deepEqual(errors, [], `erreurs JS : ${errors.join(" | ")}`);
  console.log("✓ terminé, aucune erreur JavaScript");
}

main().catch((e) => {
  console.error("✗", e);
  process.exit(1);
});
