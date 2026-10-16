/**
 * Full-page screenshots of the RUNNING app (and optionally the reference site),
 * captured with the locally installed Chrome through playwright-core.
 *
 *   npm run dev                                   (in another terminal)
 *   npm run screenshots -- --set after            → docs/screenshots/after/
 *   npm run screenshots -- --set before --reference
 *
 * Admin pages need SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD in .env.local.
 */
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

import { mkdirSync } from "node:fs";
import path from "node:path";
import mongoose from "mongoose";
import { chromium, type BrowserContext, type Page } from "playwright-core";

const arg = (name: string, fallback?: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
};
const BASE = arg("base", "http://localhost:3000")!;
const SET = arg("set", "after")!;
const OUT = path.resolve("docs/screenshots", SET);
const WITH_REFERENCE = process.argv.includes("--reference");
const ONLY = arg("only"); // optional substring filter on file names

type Ids = { vert: string; rose: string; jaune: string; bleu: string };

async function settle(page: Page) {
  // Scroll through the page so lazy images load, then return to top.
  await page.evaluate(async () => {
    const step = Math.max(400, window.innerHeight * 0.8);
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(400);
}

async function shot(page: Page, name: string, opts: { full?: boolean } = { full: true }) {
  if (ONLY && !name.includes(ONLY)) return;
  if (opts.full !== false) await settle(page);
  const file = path.join(OUT, `${name}.jpg`);
  await page.screenshot({ path: file, fullPage: opts.full !== false, type: "jpeg", quality: 82 });
  console.log("  ✓", path.relative(process.cwd(), file));
}

async function seedCart(context: BrowserContext, ids: Ids) {
  await context.addInitScript((cart) => {
    if (!sessionStorage.getItem("__cart_seeded")) {
      localStorage.setItem("rd.cart.v1", JSON.stringify(cart));
      sessionStorage.setItem("__cart_seeded", "1");
    }
  }, [
    { key: "demo-1", kind: "bundle", items: [{ productId: ids.vert, size: "M" }, { productId: ids.jaune, size: "L" }], quantity: 1 },
    { key: "demo-2", kind: "single", productId: ids.bleu, size: "S", quantity: 1 },
  ]);
}

async function adminLogin(context: BrowserContext) {
  const res = await context.request.post(`${BASE}/api/admin/auth/login`, {
    headers: { Origin: BASE },
    data: { email: process.env.SEED_ADMIN_EMAIL, password: process.env.SEED_ADMIN_PASSWORD },
  });
  if (!res.ok()) throw new Error(`Connexion admin impossible (${res.status()})`);
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  await mongoose.connect(process.env.MONGODB_URI!);
  const products = await mongoose.connection.db!.collection("products").find({}, { projection: { slug: 1 } }).toArray();
  const id = (slug: string) => String(products.find((p) => p.slug === `veste-bresil-${slug}`)!._id);
  const ids: Ids = { vert: id("vert"), rose: id("rose"), jaune: id("jaune"), bleu: id("bleu") };
  const firstOrder = await mongoose.connection.db!.collection("orders").findOne({}, { sort: { createdAt: -1 } });
  await mongoose.disconnect();

  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    /* ---------------- Desktop 1440 ---------------- */
    const desk = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce", locale: "fr-FR" });
    const d = await desk.newPage();
    await d.goto(`${BASE}/`);
    await shot(d, "desktop-1440-01-accueil");
    await d.goto(`${BASE}/produit/veste-bresil-vert`);
    await shot(d, "desktop-1440-02-fiche-produit");
    await d.goto(`${BASE}/produit/veste-bresil-vert?offre=pack`);
    await d.locator('input[name="size-0"][value="M"]').check({ force: true });
    await d.locator('input[name="size-1"][value="L"]').check({ force: true });
    await shot(d, "desktop-1440-03-fiche-pack");

    await seedCart(desk, ids);
    const d2 = await desk.newPage();
    await d2.goto(`${BASE}/panier`);
    await shot(d2, "desktop-1440-04-panier");
    await d2.goto(`${BASE}/commande`);
    await shot(d2, "desktop-1440-05-commande");

    await adminLogin(desk);
    await d2.goto(`${BASE}/admin`);
    await shot(d2, "desktop-1440-06-admin-tableau-de-bord");
    await d2.goto(`${BASE}/admin/produits`);
    await shot(d2, "desktop-1440-07-admin-produits");
    await d2.goto(`${BASE}/admin/produits/${ids.vert}`);
    await shot(d2, "desktop-1440-08-admin-produit-edition");
    await d2.goto(`${BASE}/admin/commandes`);
    await shot(d2, "desktop-1440-09-admin-commandes");
    if (firstOrder) {
      await d2.goto(`${BASE}/admin/commandes/${firstOrder._id}`);
      await shot(d2, "desktop-1440-10-admin-commande-detail");
    }
    await desk.close();

    /* ---------------- Mobile 390 ---------------- */
    const mobileOpts = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, reducedMotion: "reduce" as const, locale: "fr-FR" };
    const mob = await browser.newContext(mobileOpts);
    const m = await mob.newPage();
    await m.goto(`${BASE}/`);
    await shot(m, "mobile-390-01-accueil");
    await m.goto(`${BASE}/produit/veste-bresil-vert`);
    await shot(m, "mobile-390-02-fiche-produit");

    // Variant selection: viewport-sized view of colour + size controls with a size picked.
    await m.locator('input[name="size"][value="M"]').check({ force: true });
    await m.locator("#field-single").scrollIntoViewIfNeeded();
    await m.evaluate(() => window.scrollBy(0, -260));
    await m.waitForTimeout(300);
    await shot(m, "mobile-390-03-selection-variante", { full: false });

    await m.goto(`${BASE}/produit/veste-bresil-vert?offre=pack`);
    await m.locator('input[name="size-0"][value="M"]').check({ force: true });
    await m.locator('[aria-label="Couleur de la veste 2"] [aria-label="Jaune"]').click();
    await m.locator('input[name="size-1"][value="L"]').check({ force: true });
    await m.locator("#field-slot0").scrollIntoViewIfNeeded();
    await m.evaluate(() => window.scrollBy(0, -140));
    await m.waitForTimeout(300);
    await shot(m, "mobile-390-04-selection-pack", { full: false });

    // Add the pack → cart drawer opens.
    await m.getByRole("button", { name: /Ajouter le pack/ }).first().click();
    await m.waitForTimeout(600);
    await shot(m, "mobile-390-05-tiroir-panier", { full: false });

    await m.goto(`${BASE}/commande`);
    await shot(m, "mobile-390-06-commande");

    await adminLogin(mob);
    await m.goto(`${BASE}/admin`);
    await shot(m, "mobile-390-07-admin-tableau-de-bord");
    await mob.close();

    /* ---------------- 375 and 768 checks ---------------- */
    for (const [w, h, label] of [[375, 812, "mobile-375"], [768, 1024, "tablette-768"]] as const) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: w < 768 ? 2 : 1, isMobile: w < 768, hasTouch: w < 768, reducedMotion: "reduce", locale: "fr-FR" });
      const p = await ctx.newPage();
      await p.goto(`${BASE}/`);
      await shot(p, `${label}-01-accueil`);
      await p.goto(`${BASE}/produit/veste-bresil-jaune`);
      await shot(p, `${label}-02-fiche-produit`);

      // Bundle selection, then the cart drawer it opens.
      await p.goto(`${BASE}/produit/veste-bresil-vert?offre=pack`);
      await p.locator('input[name="size-0"][value="M"]').check({ force: true });
      await p.locator('[aria-label="Couleur de la veste 2"] [aria-label="Jaune"]').click();
      await p.locator('input[name="size-1"][value="L"]').check({ force: true });
      await p.locator("#field-slot0").scrollIntoViewIfNeeded();
      await p.evaluate(() => window.scrollBy(0, -140));
      await p.waitForTimeout(300);
      await shot(p, `${label}-03-selection-pack`, { full: false });
      await p.evaluate(() => (document.querySelector("#acheter div.mt-8 > button") as HTMLElement).click());
      await p.waitForTimeout(600);
      await shot(p, `${label}-04-tiroir-panier`, { full: false });
      await p.goto(`${BASE}/commande`);
      await shot(p, `${label}-05-commande`);
      await p.evaluate(() => localStorage.removeItem("rd.cart.v1"));
      await adminLogin(ctx);
      await p.goto(`${BASE}/admin`);
      await shot(p, `${label}-06-admin-tableau-de-bord`);
      await ctx.close();
    }

    /* ---------------- Real scrolling: sticky bar states on the product page ---------------- */
    for (const w of [375, 390]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "fr-FR" });
      const p = await ctx.newPage();
      await p.goto(`${BASE}/produit/veste-bresil-vert`, { waitUntil: "networkidle" });
      const steps: [string, string][] = [
        ["a-haut-de-page", "0"],
        ["b-cta-visible", "document.querySelector('#acheter div.mt-8').getBoundingClientRect().top + scrollY - 420"],
        ["c-apres-cta-barre-visible", "document.querySelector('#acheter div.mt-8').getBoundingClientRect().bottom + scrollY + 200"],
        ["d-pied-de-page-barre-masquee", "document.documentElement.scrollHeight"],
      ];
      for (const [name, expr] of steps) {
        await p.evaluate(`window.scrollTo({ top: ${expr}, behavior: "instant" })`);
        await p.waitForTimeout(500);
        await shot(p, `defilement-${w}-${name}`, { full: false });
      }
      await ctx.close();
    }

    /* ---------------- Reference (internal comparison only, git-ignored) ---------------- */
    if (WITH_REFERENCE) {
      const refOut = path.resolve("docs/screenshots/reference");
      mkdirSync(refOut, { recursive: true });
      for (const [w, h, label, mobile] of [[1440, 900, "desktop-1440", false], [390, 844, "mobile-390", true]] as const) {
        const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile, locale: "fr-FR" });
        const p = await ctx.newPage();
        for (const [url, name] of [["https://www.kaltshop.club/", "accueil"], ["https://www.kaltshop.club/produit/veste-bresil-vert", "fiche-produit"]]) {
          await p.goto(url, { waitUntil: "networkidle" }).catch(() => {});
          await settle(p);
          const file = path.join(refOut, `reference-${label}-${name}.jpg`);
          await p.screenshot({ path: file, fullPage: true, type: "jpeg", quality: 75 });
          console.log("  ✓", path.relative(process.cwd(), file));
        }
        await ctx.close();
      }
    }
  } finally {
    await browser.close();
  }
}

main().catch(async (err) => {
  console.error("✗", err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
