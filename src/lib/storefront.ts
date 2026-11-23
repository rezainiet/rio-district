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
import type { Locale } from "@/i18n/config";
import { translate, translator } from "@/i18n/translate";
import { localizeProduct } from "@/i18n/content";

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
export function storeFaq(settings: StoreSettings, plan: DeliveryPlan, unitPriceCents: number, locale: Locale = "fr"): FaqItem[] {
  const t = (key: string, vars?: Record<string, string | number>) => translate(locale, key, vars);
  const policy = settings.returnsPolicy;
  const items: FaqItem[] = [
    {
      question: t("Quand vais-je recevoir ma commande ?"),
      answer: t(
        settings.shipping.priceCents === 0
          ? "La livraison est offerte et suivie, en {min} à {max} jours ouvrés après la confirmation de ta commande. Pour une commande aujourd'hui : livraison estimée {range}. Tu reçois le numéro de suivi par e-mail à l'expédition."
          : "La livraison est suivie, en {min} à {max} jours ouvrés après la confirmation de ta commande. Pour une commande aujourd'hui : livraison estimée {range}. Tu reçois le numéro de suivi par e-mail à l'expédition.",
        { min: plan.minDays, max: plan.maxDays, range: rangeLong(plan.deliveryFrom, plan.deliveryTo, locale) },
      ),
    },
    {
      question: t("Comment choisir ma taille ?"),
      answer: t("Les vestes vont du XS au 3XL avec une coupe ample. « Trouver ma taille » te donne une estimation à partir de ta taille et de ton poids, avec les mesures de chaque taille. Entre deux tailles, prends la plus grande."),
    },
    {
      question: t("Puis-je retourner ma commande ?"),
      answer: `${t("Oui. Tu disposes de {n} jours après la réception de ta commande pour demander un retour.", { n: policy.windowDays })} ${returnsHowTo(policy, locale)} ${t("Tes droits légaux de consommateur restent applicables en plus de ce délai.")}`,
    },
    {
      question: t("Quand suis-je remboursé ?"),
      answer: policy.refundDelayDays
        ? t("Le remboursement est effectué sous {n} jours après réception et vérification de l'article retourné.", { n: policy.refundDelayDays })
        : t("Le remboursement est effectué après réception et vérification de l'article retourné, sur le moyen de paiement utilisé. [Délai à confirmer par la boutique]"),
    },
    {
      question: t("La taille que je veux est-elle disponible ?"),
      answer: t("La disponibilité affichée vient directement de notre stock, taille par taille. Une taille épuisée est barrée et ne peut pas être commandée."),
    },
    {
      question: t("Comment fonctionne le pack 2 vestes ?"),
      answer: t(
        "Le pack réunit {n} vestes pour {price} au lieu de {full}. Tu choisis la couleur et la taille de chacune (deux couleurs différentes ou la même). La remise s'applique automatiquement au panier.",
        { n: settings.bundle.quantity, price: formatEUR(settings.bundle.priceCents), full: formatEUR(unitPriceCents * settings.bundle.quantity) },
      ),
    },
    {
      question: t("Comment se passe le paiement ?"),
      answer: paymentsEnabled(settings)
        ? t("Tu complètes tes coordonnées sur Rio District, puis tu continues sur le site de notre partenaire externe. Le statut reste en attente jusqu’à vérification du paiement par la boutique.")
        : t("Le paiement en ligne n'est pas encore ouvert. Tu envoies une demande de commande, nous la confirmons par e-mail et t'indiquons comment régler. Rien n'est débité sur le site."),
    },
    {
      question: t("Comment contacter le service client ?"),
      answer: t("Écris-nous à {email} ou via le formulaire de contact, avec ton numéro de commande si tu en as un. [Délai de réponse à confirmer par la boutique]", { email: settings.contactEmail }),
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
  /** Language of the page: product text, FAQ, policy and links come back in it (French by default). */
  locale?: Locale;
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
  const tr = translator(opts.locale ?? "fr");
  const local = (p: PublicProduct) => localizeProduct(withStock(p), tr);
  const policy = settings.returnsPolicy;
  return {
    product: local(product),
    siblings: siblings.map(local),
    bundleOptions: bundleOptions.map(local),
    related: all.filter((p) => p.id !== product.id).map(local),
    stock,
    reviews: block.reviews,
    summary: block.summary,
    reviewSource: block.source,
    // Links are localized in both languages ("/" is the Spanish home page); tx() leaves French text as it is.
    countdown: countdown && { ...countdown, title: tr.tx(countdown.title), text: tr.tx(countdown.text), ctaLabel: tr.tx(countdown.ctaLabel), ctaHref: countdown.ctaHref ? tr.href(countdown.ctaHref) : "" },
    plan,
    freeShipping: settings.shipping.priceCents === 0,
    policy: tr.locale === "fr" ? policy : {
      ...policy,
      damagedParcel: policy.damagedParcel === null ? null : tr.tx(policy.damagedParcel),
      wrongItem: policy.wrongItem === null ? null : tr.tx(policy.wrongItem),
    },
    payments: { online: paymentsEnabled(settings) },
    contactEmail: settings.contactEmail,
    faq: storeFaq(settings, plan, product.priceCents, tr.locale),
    sizeRules: settings.sizeRules,
    sizeChart: settings.sizeChart,
    returnsHref: tr.href(RETURNS_PATH),
  };
}

export type { RatingSummary };
