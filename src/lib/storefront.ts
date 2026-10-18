import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import { connectDB } from "./db";
import { getActiveProducts, getSettings } from "./catalog";
import type { FaqItem, StoreSettings } from "./defaults";
import { DEFAULT_DISPATCH, deliveryPlan, rangeLong, type DeliveryPlan } from "./delivery-plan";
import { countdownFor, displayName, parisLocalToUtc, summarizeRatings, type RatingSummary } from "./marketing";
import { formatEUR } from "./money";
import { paymentsEnabled } from "./payments";
import { returnsHowTo } from "./policies";
import { getProductReviews, getStoreReviews, type PublicReview, type ReviewBlock } from "./reviews";
import type { Size } from "./sizes";
import { stockInfo, type StockInfo } from "./stock-status";
import type { PublicProduct } from "./types";
import { Product } from "@/models/Product";
import type { PreviewData } from "@/components/store/pdp/types";

/**
 * Data for the customer-facing pages, shared by the live storefront and the
 * design-review previews. Everything comes from the database and the store
 * settings; nothing is invented.
 */

/** Development (or an explicitly enabled private staging): preview-only helpers are allowed. */
export function previewsEnabled() {
  return process.env.NODE_ENV !== "production" || process.env.DESIGN_REVIEW_ENABLED === "1";
}

export const RETURNS_PATH = "/retours-remboursements";

/* ---------- Reviews: the database; in development only, the client-confirmed manifest ---------- */

type Manifest = {
  authorization: { status: string; reviewsAreGenuine: boolean | null; reuseAuthorized: boolean | null; photosAuthorized: boolean | null; confirmedBy: string | null; confirmedAt: string | null };
  reviews: { key: string; position: number; author: string; rating: number; text: string; photoSource: string | null; approved: boolean }[];
};

/**
 * The reviews published on riodistrict.store were imported from this manifest
 * after the client's written confirmation. When a development database has
 * none published, previews read the same records read-only (and say so on
 * screen). Never used in production, never written to a database.
 */
function manifestReviews(): ReviewBlock | null {
  try {
    const m = JSON.parse(readFileSync(path.join(process.cwd(), "scripts/data/reference-reviews.json"), "utf8")) as Manifest;
    const a = m.authorization;
    if (a.status !== "confirmed" || !a.reviewsAreGenuine || !a.reuseAuthorized || !a.confirmedBy || !a.confirmedAt) return null;
    const list = m.reviews.filter((r) => r.approved).sort((x, y) => x.position - y.position);
    return {
      summary: summarizeRatings(list.map((r) => r.rating)),
      reviews: list.map(
        (r): PublicReview => ({
          id: r.key,
          author: displayName(r.author),
          title: "",
          text: r.text,
          rating: r.rating,
          verified: false, // no order on this site: never shown as "Achat vérifié"
          date: null,
          color: "",
          photos: a.photosAuthorized && r.photoSource ? [r.photoSource] : [],
        }),
      ),
    };
  } catch {
    return null;
  }
}

export type ReviewSource = "database" | "manifest" | "forced-empty";

async function withDevFallback(block: ReviewBlock, limit?: number): Promise<ReviewBlock & { source: ReviewSource }> {
  if (block.summary.count > 0 || !previewsEnabled()) return { ...block, source: "database" };
  const m = manifestReviews();
  if (!m) return { ...block, source: "database" };
  return { summary: m.summary, reviews: limit ? m.reviews.slice(0, limit) : m.reviews, source: "manifest" };
}

export async function homeReviews(products: PublicProduct[], limit = 8) {
  return withDevFallback(await getStoreReviews(products, limit), limit);
}

/* ---------- Stock (the public product hides raw quantities) ---------- */

type RawSizes = { slug: string; sizes: { label: Size; enabled: boolean; stock: number | null }[] };

async function rawStock(slugs: string[]) {
  await connectDB();
  const docs = await Product.find({ slug: { $in: slugs }, status: "active" }, { slug: 1, sizes: 1 }).lean<RawSizes[]>();
  return new Map(docs.map((d) => [d.slug, d.sizes.map((s) => ({ label: s.label, enabled: s.enabled !== false, stock: typeof s.stock === "number" ? s.stock : null }))]));
}

/** Preview-only stock: 7 units left across sizes, two sizes sold out (always tagged on the page). */
const SIMULATED: Record<Size, number> = { XS: 1, S: 2, M: 1, L: 2, XL: 1, XXL: 0, "3XL": 0 };

/** Next Sunday 23:59 (Paris): a fixed deadline, so reloading never resets the sample countdown. */
function sampleDeadline(now = new Date()) {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" }).formatToParts(now);
  const get = (t: string) => p.find((x) => x.type === t)!.value;
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  const base = new Date(`${get("year")}-${get("month")}-${get("day")}T00:00:00Z`);
  const sunday = new Date(base.getTime() + ((7 - wd) % 7) * 86_400_000);
  let end = parisLocalToUtc(`${sunday.toISOString().slice(0, 10)}T23:59`)!;
  if (Date.parse(end) <= now.getTime()) end = parisLocalToUtc(`${new Date(sunday.getTime() + 7 * 86_400_000).toISOString().slice(0, 10)}T23:59`)!;
  return end;
}

/* ---------- Delivery, FAQ ---------- */

export function storePlan(settings: StoreSettings): DeliveryPlan {
  return deliveryPlan({ ...DEFAULT_DISPATCH, ...settings.dispatch });
}

/** Removes "[à confirmer]" markers outside previews (an unconfirmed term is simply not stated). */
export function publicText(text: string) {
  return previewsEnabled() ? text : text.replace(/\s*\[[^\]]+\]/g, "").trim();
}

/** Customer FAQ built from the confirmed settings (returns policy, delivery plan, bundle, payment). */
export function storeFaq(settings: StoreSettings, plan: DeliveryPlan, unitPriceCents: number): FaqItem[] {
  const policy = settings.returnsPolicy;
  const items: FaqItem[] = [
    {
      question: "Quand vais-je recevoir ma commande ?",
      answer: `La livraison est ${settings.shipping.priceCents === 0 ? "offerte et " : ""}suivie, en ${plan.minDays} à ${plan.maxDays} jours ouvrés après la confirmation de ta commande. Pour une commande aujourd'hui : livraison estimée ${rangeLong(plan.deliveryFrom, plan.deliveryTo)}. Tu reçois le numéro de suivi par e-mail à l'expédition.`,
    },
    {
      question: "Comment choisir ma taille ?",
      answer: "Les vestes vont du XS au 3XL avec une coupe ample. « Trouver ma taille » te donne une estimation à partir de ta taille et de ton poids, avec les mesures de chaque taille. Entre deux tailles, prends la plus grande.",
    },
    {
      question: "Puis-je retourner ma commande ?",
      answer: `Oui. Tu disposes de ${policy.windowDays} jours après la réception de ta commande pour demander un retour. ${returnsHowTo(policy)} Tes droits légaux de consommateur restent applicables en plus de ce délai.`,
    },
    {
      question: "Quand suis-je remboursé ?",
      answer: policy.refundDelayDays
        ? `Le remboursement est effectué sous ${policy.refundDelayDays} jours après réception et vérification de l'article retourné.`
        : "Le remboursement est effectué après réception et vérification de l'article retourné, sur le moyen de paiement utilisé. [Délai à confirmer par la boutique]",
    },
    {
      question: "La taille que je veux est-elle disponible ?",
      answer: "La disponibilité affichée vient directement de notre stock, taille par taille. Une taille épuisée est barrée et ne peut pas être commandée.",
    },
    {
      question: "Comment fonctionne le pack 2 vestes ?",
      answer: `Le pack réunit ${settings.bundle.quantity} vestes pour ${formatEUR(settings.bundle.priceCents)} au lieu de ${formatEUR(unitPriceCents * settings.bundle.quantity)}. Tu choisis la couleur et la taille de chacune (deux couleurs différentes ou la même). La remise s'applique automatiquement au panier.`,
    },
    {
      question: "Comment se passe le paiement ?",
      answer: paymentsEnabled(settings)
        ? "Tu complètes tes coordonnées sur Rio District, puis tu continues sur le site de notre partenaire externe. Le statut reste en attente jusqu’à vérification du paiement par la boutique."
        : "Le paiement en ligne n'est pas encore ouvert. Tu envoies une demande de commande, nous la confirmons par e-mail et t'indiquons comment régler. Rien n'est débité sur le site.",
    },
    {
      question: "Comment contacter le service client ?",
      answer: `Écris-nous à ${settings.contactEmail} ou via le formulaire de contact, avec ton numéro de commande si tu en as un. [Délai de réponse à confirmer par la boutique]`,
    },
  ];
  return items.map((f) => ({ question: f.question, answer: publicText(f.answer) }));
}

/** Announcement text with the return window aligned on the returns policy (the admin text may predate it). */
export function announcementText(settings: StoreSettings) {
  return settings.announcement.text.replace(/Retours? sous \d+ jours/i, `Retour sous ${settings.returnsPolicy.windowDays} jours`);
}

/* ---------- Product page ---------- */

export type ProductPageOptions = {
  /** Design review only: labelled sample data where production has none (campaign, tracked stock). */
  demo?: boolean;
  /** Design review only: preview the "no review yet" state. */
  noReviews?: boolean;
};

export async function loadProductPage(slug: string, opts: ProductPageOptions = {}): Promise<PreviewData | null> {
  const demo = Boolean(opts.demo) && previewsEnabled();
  const [settings, all] = await Promise.all([getSettings(), getActiveProducts()]);
  const product = all.find((p) => p.slug === slug);
  if (!product) return null;
  const siblings = product.group ? all.filter((p) => p.group === product.group) : [product];
  const bundleOptions = all.filter((p) => p.bundleEligible && (!product.group || p.group === product.group));

  const raw = await rawStock(all.map((p) => p.slug));
  const anyTracked = [...raw.values()].some((sizes) => sizes.some((s) => s.stock !== null));
  const simulate = demo && !anyTracked;
  const stock: Record<string, StockInfo> = {};
  for (const p of all) {
    const sizes = raw.get(p.slug) ?? p.sizes.map((s) => ({ label: s.label, enabled: s.available, stock: null }));
    stock[p.id] = simulate ? stockInfo(sizes.map((s) => ({ ...s, stock: SIMULATED[s.label] })), true) : stockInfo(sizes);
  }
  // Simulated sold-out sizes must also be unselectable in the preview.
  const withStock = (p: PublicProduct) =>
    simulate ? { ...p, sizes: p.sizes.map((s) => ({ ...s, available: s.available && SIMULATED[s.label] > 0, remaining: null })) } : p;

  let block: ReviewBlock & { source: ReviewSource };
  if (opts.noReviews && previewsEnabled()) block = { summary: summarizeRatings([]), reviews: [], source: "forced-empty" };
  else block = await withDevFallback(await getProductReviews(product, siblings));

  const real = countdownFor(settings.countdown, "product");
  const countdown = real
    ? { ...real, sample: false }
    : demo
      ? { title: "Offre pack 2 vestes", text: "", ctaLabel: "", ctaHref: "", endsAt: sampleDeadline(), serverNow: Date.now(), sample: true }
      : null;

  const plan = storePlan(settings);
  return {
    product: withStock(product),
    siblings: siblings.map(withStock),
    bundleOptions: bundleOptions.map(withStock),
    related: all.filter((p) => p.id !== product.id).map(withStock),
    stock,
    reviews: block.reviews,
    summary: block.summary,
    reviewSource: block.source,
    countdown,
    plan,
    freeShipping: settings.shipping.priceCents === 0,
    policy: settings.returnsPolicy,
    payments: { online: paymentsEnabled(settings) },
    contactEmail: settings.contactEmail,
    faq: storeFaq(settings, plan, product.priceCents),
    sizeRules: settings.sizeRules,
    sizeChart: settings.sizeChart,
    returnsHref: RETURNS_PATH,
  };
}

export type { RatingSummary };
