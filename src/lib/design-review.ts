import "server-only";
import { RETURNS_PATH, loadProductPage, previewsEnabled, type ProductPageOptions } from "./storefront";
import type { PreviewData } from "@/components/store/pdp/types";

/**
 * Product-page design review (/design-review/...). Development only, or with
 * DESIGN_REVIEW_ENABLED=1 on a private staging: the routes return 404 in
 * production and are never indexed.
 */
export const designReviewEnabled = previewsEnabled;

export const DESIGN_CONCEPTS = [
  {
    key: "product-01",
    num: "01",
    name: "Trust-First Commerce",
    short: "Confiance d'abord",
    intent: "La structure de KALT, en mieux : tout ce qui rassure (note, stock, date de livraison, retours) est au-dessus du bouton, sans chercher.",
  },
  {
    key: "product-02",
    num: "02",
    name: "Premium Fashion Commerce",
    short: "Mode premium",
    intent: "Une fiche éditoriale haut de gamme, sans rien perdre de l'information d'achat : grande photo, panneau d'achat soigné, livraison et avis mis en scène.",
  },
  {
    key: "product-03",
    num: "03",
    name: "Mobile Conversion Pro",
    short: "Conversion mobile",
    intent: "Pensée pour le visiteur qui arrive d'une publicité sur son téléphone : comprendre, choisir et commander en un minimum de gestes.",
  },
] as const;
export type DesignConceptKey = (typeof DESIGN_CONCEPTS)[number]["key"];

export const RETURNS_PREVIEW_PATH = RETURNS_PATH;
export const DEFAULT_PREVIEW_SLUG = "veste-bresil-vert";

export type PreviewOptions = Required<ProductPageOptions>;

export function loadPreview(slug: string, opts: PreviewOptions): Promise<PreviewData | null> {
  return loadProductPage(slug, opts);
}
