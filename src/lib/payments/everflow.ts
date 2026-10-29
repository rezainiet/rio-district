import { validFbclid } from "../fbclid";
import { validSccid } from "../sccid";

/** Pure provider contract. No network calls, sessions or payment verification. */
export const EVERFLOW_OFFERS = {
  single: { amount: 1999, url: "https://www.molipy8trk.com/2J23GL9/TTF23GH/" },
  bundle: { amount: 2495, url: "https://www.molipy8trk.com/2J23GL9/TRSKRX3/" },
} as const;
export type Offer = keyof typeof EVERFLOW_OFFERS;
export class HostedCheckoutError extends Error {}
type Env = Record<string, string | undefined>;
export type CheckoutPresentation = { mode: "request" | "mock" | "live"; available: boolean; error?: string; advertising: boolean };
type OfferShape = { currency?: string; totalCents: number; shippingCents: number; lines: { kind: string; quantity: number; totalCents: number; unitPriceCents: number; items: unknown[] }[] };

export function eligibleOffer(order: OfferShape): Offer {
  const line = order.lines[0];
  const kind = line?.kind as Offer;
  const offer = EVERFLOW_OFFERS[kind];
  if ((order.currency ?? "EUR") !== "EUR" || order.shippingCents !== 0 || order.lines.length !== 1 ||
    !offer || line.quantity !== 1 || line.items.length !== (kind === "single" ? 1 : 2) ||
    order.totalCents !== offer.amount || line.totalCents !== offer.amount || line.unitPriceCents !== offer.amount) {
    throw new HostedCheckoutError("Ce paiement accepte une seule veste à 19,99 € ou un seul pack de 2 à 24,95 €, livraison offerte. Modifie ton panier pour continuer.");
  }
  return kind;
}

export function approvedDestination(value: string | undefined, offer: Offer): string {
  // Exact URL comparison also rejects credentials, fragments, ports and query overrides.
  if (value !== EVERFLOW_OFFERS[offer].url) throw new HostedCheckoutError("Lien de paiement indisponible : la boutique doit vérifier sa configuration Everflow.");
  const url = new URL(value);
  if (url.protocol !== "https:" || url.hostname !== "www.molipy8trk.com") throw new HostedCheckoutError("Destination de paiement refusée.");
  return url.href;
}

export function encodeFacebook(id: string) { return id; }
export function encodeTikTok(id: string) { return "_".repeat(3) + id; }
export function encodeGoogle(id: string, label: string) { return "_".repeat(6) + id + "_".repeat(3) + label; }
export function encodeSnapchat(id: string) { return "_".repeat(21) + id; }
function trackingValue(value: string | undefined) {
  if (!value || !/^[A-Za-z0-9_-]{1,150}$/.test(value)) throw new HostedCheckoutError("Identifiant de suivi incomplet ou invalide.");
  return value;
}
export function pixelValue(env: Env): string | null {
  const platform = env.EVERFLOW_PIXEL_PLATFORM ?? "";
  const ids = [env.EVERFLOW_FACEBOOK_PIXEL_ID, env.EVERFLOW_TIKTOK_PIXEL_ID, env.EVERFLOW_GOOGLE_PIXEL_ID, env.EVERFLOW_SNAPCHAT_PIXEL_ID];
  if (!platform && !ids.some(Boolean) && !env.EVERFLOW_GOOGLE_PIXEL_LABEL) return null;
  if (platform === "facebook,snapchat" || platform === "snapchat,facebook") {
    if (!/^\d{10,20}$/.test(env.EVERFLOW_FACEBOOK_PIXEL_ID ?? "") ||
      !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(env.EVERFLOW_SNAPCHAT_PIXEL_ID ?? "") ||
      env.EVERFLOW_TIKTOK_PIXEL_ID || env.EVERFLOW_GOOGLE_PIXEL_ID || env.EVERFLOW_GOOGLE_PIXEL_LABEL) {
      throw new HostedCheckoutError("Configure uniquement les identifiants Pixel Meta et Snapchat valides pour le suivi Everflow combiné.");
    }
    return encodeFacebook(env.EVERFLOW_FACEBOOK_PIXEL_ID!) + encodeSnapchat(env.EVERFLOW_SNAPCHAT_PIXEL_ID!);
  }
  const index = ["facebook", "tiktok", "google", "snapchat"].indexOf(platform);
  if (index < 0 || ids.filter(Boolean).length !== 1 || !ids[index] || (index !== 2 && env.EVERFLOW_GOOGLE_PIXEL_LABEL)) {
    throw new HostedCheckoutError("Configure une seule plateforme publicitaire Everflow, ou désactive tous ses identifiants.");
  }
  if (platform === "facebook" && !/^\d{10,20}$/.test(ids[index])) throw new HostedCheckoutError("Identifiant Pixel Meta invalide.");
  if (platform === "snapchat" && !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(ids[index])) throw new HostedCheckoutError("Identifiant Pixel Snapchat invalide.");
  const id = trackingValue(ids[index]);
  return index === 0 ? encodeFacebook(id) : index === 1 ? encodeTikTok(id) : index === 2 ? encodeGoogle(id, trackingValue(env.EVERFLOW_GOOGLE_PIXEL_LABEL)) : encodeSnapchat(id);
}

export function publicImage(image: string, base: string): string {
  let root: URL;
  let url: URL;
  try { root = new URL(base); url = new URL(image, root); } catch { throw new HostedCheckoutError("Image publique de paiement non configurée."); }
  // Approved first-party public asset origin, never arbitrary product URLs or localhost.
  if (root.protocol !== "https:" || root.username || root.password || root.port || root.search || root.hash || root.pathname !== "/" ||
    !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(root.hostname) || /(^|\.)(localhost|local|test|invalid)$/i.test(root.hostname) ||
    url.origin !== root.origin || url.search || url.hash || !/\.(?:webp|png|jpe?g|avif)$/i.test(url.pathname) || image.startsWith("//")) {
    throw new HostedCheckoutError("Une photo approuvée sur le domaine public HTTPS configuré est nécessaire.");
  }
  return url.href;
}

export function readEverflowConfig(env: Env) {
  if (env.EVERFLOW_ENABLED !== "true") return null;
  if (env.PAYMENT_PROVIDER !== "everflow") throw new HostedCheckoutError("Paiement indisponible : configure PAYMENT_PROVIDER=everflow ou désactive explicitement EVERFLOW_ENABLED.");
  const mode = env.EVERFLOW_MODE;
  if (mode !== "mock" && mode !== "live") throw new HostedCheckoutError("Choisis explicitement le mode de paiement mock ou live.");
  if (mode === "mock" && (env.APP_ENV !== "development" || !/^mongodb:\/\/127\.0\.0\.1:\d+\/rio_everflow_test_[a-z0-9_]+(?:\?.*)?$/i.test(env.MONGODB_URI ?? ""))) {
    throw new HostedCheckoutError("Le simulateur nécessite une base locale isolée rio_everflow_test_* et APP_ENV=development.");
  }
  if (mode === "live" && (env.EVERFLOW_LIVE_APPROVED !== "true" || env.EVERFLOW_VARIANTS_APPROVED !== "true")) {
    throw new HostedCheckoutError("Le paiement externe attend la validation du partenaire et l’approbation de la boutique. Aucun paiement n’a été lancé.");
  }
  const single = approvedDestination(env.EVERFLOW_SINGLE_CHECKOUT_URL, "single");
  const bundle = approvedDestination(env.EVERFLOW_BUNDLE_CHECKOUT_URL, "bundle");
  const imageBase = env.EVERFLOW_PUBLIC_ASSET_BASE_URL ?? "";
  publicImage("/validation.webp", imageBase);
  const pixel = pixelValue(env);
  if (pixel && env.EVERFLOW_PIXEL_APPROVED !== "true") throw new HostedCheckoutError("Le suivi publicitaire attend la validation du consentement et du partenaire.");
  const sub1Mode = env.EVERFLOW_SUB1_MODE ?? "disabled";
  if (!["disabled", "provider", "correlation"].includes(sub1Mode) ||
    (sub1Mode === "correlation" && (env.EVERFLOW_SUB1_CORRELATION_APPROVED !== "true" || env.EVERFLOW_PROVIDER_CLICK_ID)) ||
    (sub1Mode !== "provider" && env.EVERFLOW_PROVIDER_CLICK_ID)) throw new HostedCheckoutError("Configuration du click ID ambiguë ou non approuvée.");
  const clickId = sub1Mode === "provider" ? trackingValue(env.EVERFLOW_PROVIDER_CLICK_ID) : null;
  const source = env.EVERFLOW_SOURCE_ID ? trackingValue(env.EVERFLOW_SOURCE_ID) : null;
  const countries = (env.EVERFLOW_COUNTRIES ?? "FR").split(",").map(v => v.trim()).filter(Boolean);
  if (!countries.length || countries.some(v => !/^[A-Z]{2}$/.test(v))) throw new HostedCheckoutError("Pays de paiement non configurés.");
  return { mode: mode as "mock" | "live", single, bundle, imageBase, pixel, source, sub1Mode, clickId, countries,
    bundleApproved: env.EVERFLOW_BUNDLE_METADATA_APPROVED === "true", bundleImage: env.EVERFLOW_BUNDLE_IMAGE_URL ?? "" };
}
export type EverflowConfig = NonNullable<ReturnType<typeof readEverflowConfig>>;
export type PrefillOrder = Omit<OfferShape, "lines"> & {
  attribution?: { fbclid?: string | null; sccid?: string | null } | null;
  customer: { firstName?: string | null; lastName?: string | null; email: string; phone: string; phoneE164?: string | null };
  shipping: { address: string; address2?: string | null; city: string; postalCode: string; country: string };
  lines: (Omit<OfferShape["lines"][number], "items"> & { items: { name?: string | null; color?: string | null; size?: string | null; image?: string | null }[] })[];
};
/** Values entered on our checkout form, sent on the first partner tracking request. */
function appendCustomerPrefill(url: URL, order: Pick<PrefillOrder, "customer" | "shipping">) {
  const fields = new URLSearchParams({
    sub10: order.customer.firstName!,
    adv3: order.customer.lastName!,
    sub3: order.shipping.postalCode,
    sub4: order.customer.email,
    sub6: order.shipping.city,
    sub7: [order.shipping.address, order.shipping.address2].filter(Boolean).join(", "),
    sub8: order.customer.phoneE164 || order.customer.phone,
  });
  // Keep the offer URL and any existing tracking parameters intact.
  for (const [key, value] of fields) url.searchParams.set(key, value);
}
export function buildEverflowUrl(order: PrefillOrder, config: EverflowConfig, correlation: string, consent: boolean): string {
  const offer = eligibleOffer(order);
  if (!order.customer.firstName || !order.customer.lastName) throw new HostedCheckoutError("Indique séparément ton prénom et ton nom pour le paiement.");
  if (!config.countries.includes(order.shipping.country)) throw new HostedCheckoutError("Ce partenaire ne prend pas encore en charge le pays de livraison choisi.");
  if (offer === "bundle" && config.mode === "live" && (!config.bundleApproved || !config.bundleImage)) throw new HostedCheckoutError("Les variantes et l’image du pack doivent être validées avec le partenaire avant activation.");
  const items = order.lines[0].items;
  const name = offer === "single" ? items[0].name : `Pack 2 vestes : ${items.map(i => `${i.name} (${i.color}, ${i.size})`).join(" + ")}`;
  if (!name) throw new HostedCheckoutError("Produit de paiement invalide.");
  const image = publicImage(offer === "bundle" && config.bundleImage ? config.bundleImage : items[0].image ?? "", config.imageBase);
  const url = new URL(approvedDestination(config[offer], offer));
  appendCustomerPrefill(url, order);
  url.searchParams.set("adv1", name);
  url.searchParams.set("adv2", image);
  if (config.source) url.searchParams.set("source_id", config.source);
  // A checkout link must never enable a provider-side browser Purchase pixel.
  // Retain legacy config fields for pending-attempt hash compatibility only.
  // sub1 = click ID of the ad that brought the visitor: Meta fbclid, otherwise Snapchat ScCid (as on the Swiss shop).
  // Everflow's Snapchat integration reads the named ScCid parameter ({ScCid}); the Meta one reads fbclid.
  const fbclid = consent ? order.attribution?.fbclid : null;
  const sccid = consent ? order.attribution?.sccid : null;
  if (fbclid && !validFbclid(fbclid)) throw new HostedCheckoutError("Identifiant de clic Meta invalide.");
  if (sccid && !validSccid(sccid)) throw new HostedCheckoutError("Identifiant de clic Snapchat invalide.");
  const clickId = fbclid || sccid;
  if (clickId) url.searchParams.set("sub1", clickId);
  if (fbclid) url.searchParams.set("fbclid", fbclid);
  if (sccid) url.searchParams.set("ScCid", sccid);
  return url.href;
}
