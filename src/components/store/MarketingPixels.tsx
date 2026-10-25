"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useStore } from "./StoreProvider";
import { validFbclid } from "@/lib/fbclid";
import type { CartQuote } from "@/lib/types";

const SNAP_PIXEL_ID = "25924406-58d9-4767-9b28-e91773f5ba30";
const META_PIXEL_ID = "1306059791382915";
const SNAP_SCRIPT_URL = "https://sc-static.net/scevent.min.js";
const META_SCRIPT_URL = "https://connect.facebook.net/en_US/fbevents.js";
// New choice: existing Snapchat consent did not cover Meta.
const STORAGE_KEY = "rd.marketing-consent.v1";
const FBCLID_STORAGE_KEY = "rd.meta.fbclid";
const CHOICE_LIFETIME_MS = 180 * 24 * 60 * 60 * 1000;
const OPEN_EVENT = "rio:marketing-consent-open";
const CART_ADD_EVENT = "rio:cart-add";
export const MARKETING_CONSENT_CHANGED_EVENT = "rio:marketing-consent-changed";
const startedCheckouts = new Set<string>();

type Choice = "accepted" | "refused";
type Snaptr = ((...args: unknown[]) => void) & { queue?: unknown[][]; handleRequest?: (...args: unknown[]) => void };
type Fbq = ((...args: unknown[]) => void) & { queue?: unknown[][]; callMethod?: (...args: unknown[]) => void; push?: Fbq; loaded?: boolean; version?: string; disablePushState?: boolean };

declare global {
  interface Window { snaptr?: Snaptr; fbq?: Fbq; _fbq?: Fbq; }
}

function savedChoice(): Choice | null {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if ((data?.choice === "accepted" || data?.choice === "refused") &&
        typeof data.at === "number" && Date.now() - data.at < CHOICE_LIFETIME_MS && data.at <= Date.now()) return data.choice;
  } catch { /* Storage can be unavailable in private browsing. */ }
  return null;
}

/** Retain the original Meta click ID for this tab only after marketing consent. */
export function rememberConsentedFbclid(search: string): void {
  if (savedChoice() !== "accepted") return;
  const value = new URLSearchParams(search).get("fbclid");
  if (!validFbclid(value)) return;
  try { sessionStorage.setItem(FBCLID_STORAGE_KEY, value); } catch {}
}

export function consentedFbclid(): string | null {
  if (savedChoice() !== "accepted") return null;
  try {
    const value = sessionStorage.getItem(FBCLID_STORAGE_KEY);
    return validFbclid(value) ? value : null;
  } catch { return null; }
}

function startPixels() {
  if (!window.snaptr) {
    const snaptr = ((...args: unknown[]) => {
      if (snaptr.handleRequest) snaptr.handleRequest(...args);
      else snaptr.queue!.push(args);
    }) as Snaptr;
    snaptr.queue = [];
    window.snaptr = snaptr;
    const script = document.createElement("script");
    script.src = SNAP_SCRIPT_URL;
    script.async = true;
    script.dataset.rioSnapPixel = "true";
    document.head.appendChild(script);
    snaptr("init", SNAP_PIXEL_ID, {});
  }
  if (!window.fbq) {
    const fbq = ((...args: unknown[]) => {
      if (fbq.callMethod) fbq.callMethod(...args);
      else fbq.queue!.push(args);
    }) as Fbq;
    fbq.queue = [];
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = "2.0";
    // Our pathname effect tracks real routes; Meta's history hook also counts size/offer URL edits.
    fbq.disablePushState = true;
    window.fbq = window._fbq = fbq;
    // All funnel events are explicit, so Meta's automatic button events add noise.
    fbq("set", "autoConfig", false, META_PIXEL_ID);
    const script = document.createElement("script");
    script.src = META_SCRIPT_URL;
    script.async = true;
    script.dataset.rioMetaPixel = "true";
    document.head.appendChild(script);
    fbq("init", META_PIXEL_ID);
  }
}

/** Track a valid checkout once per cart in this tab, after marketing consent. */
export function trackCheckoutStart(quote: CartQuote, cartKey: string): boolean {
  if (savedChoice() !== "accepted" || !cartKey || quote.errors.length > 0 ||
      !Number.isInteger(quote.totalCents) || quote.totalCents <= 0 || quote.itemsCount <= 0) return false;
  const key = `rd.pixel.checkout-start:${cartKey}`;
  if (startedCheckouts.has(key)) return false;
  try { if (sessionStorage.getItem(key)) return false; } catch {}
  const quantities = new Map<string, number>();
  for (const line of quote.lines) for (const item of line.items) {
    quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + line.quantity);
  }
  if (quantities.size === 0) return false;
  startPixels();
  window.fbq?.("trackSingle", META_PIXEL_ID, "InitiateCheckout", {
    content_ids: [...quantities.keys()],
    contents: [...quantities].map(([id, quantity]) => ({ id, quantity })),
    content_type: "product",
    num_items: quote.itemsCount,
    value: quote.totalCents / 100,
    currency: "EUR",
  });
  startedCheckouts.add(key);
  try { sessionStorage.setItem(key, "1"); } catch {}
  return true;
}

/** Track the confirmed redirect to hosted checkout; the provider owns the Purchase event. */
export function trackCheckoutClick(totalCents: number, orderNumber: string): boolean {
  if (savedChoice() !== "accepted" || !Number.isInteger(totalCents) || totalCents <= 0 || !orderNumber) return false;
  const key = `rd.pixel.checkout-click:${orderNumber}`;
  try { if (sessionStorage.getItem(key)) return false; } catch {}
  startPixels();
  const value = totalCents / 100;
  window.snaptr?.("track", "START_CHECKOUT", { price: value.toFixed(2), currency: "EUR" });
  try { sessionStorage.setItem(key, "1"); } catch {}
  return true;
}

export function MarketingPixels() {
  const pathname = usePathname();
  const { products } = useStore();
  const [choice, setChoice] = useState<Choice | null>(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const trackedPath = useRef<string | null>(null);

  useEffect(() => {
    const stored = savedChoice();
    queueMicrotask(() => { setChoice(stored); setReady(true); setOpen(stored === null); });
    const showSettings = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, showSettings);
    return () => window.removeEventListener(OPEN_EVENT, showSettings);
  }, []);

  useEffect(() => {
    // Confirmation and local payment-test URLs contain private order tokens.
    if (!ready || choice !== "accepted" || !pathname ||
        pathname.startsWith("/commande/confirmation/") || pathname.startsWith("/commande/paiement-test/")) return;
    rememberConsentedFbclid(window.location.search);
    startPixels();
    if (trackedPath.current !== pathname) {
      window.snaptr?.("track", "PAGE_VIEW");
      window.fbq?.("trackSingle", META_PIXEL_ID, "PageView");
      const product = products.find(item => pathname === `/produit/${item.slug}`);
      if (product) window.fbq?.("trackSingle", META_PIXEL_ID, "ViewContent", {
        content_ids: [product.id], content_type: "product", value: product.priceCents / 100, currency: product.currency ?? "EUR",
      });
      trackedPath.current = pathname;
    }
  }, [ready, choice, pathname, products]);

  useEffect(() => {
    if (choice !== "accepted") return;
    const onCartAdd = (event: Event) => {
      const detail = (event as CustomEvent<{ content_ids: string[]; value: number }>).detail;
      if (!detail || !Array.isArray(detail.content_ids) || !Number.isFinite(detail.value)) return;
      window.fbq?.("trackSingle", META_PIXEL_ID, "AddToCart", {
        content_ids: detail.content_ids, content_type: "product", value: detail.value, currency: "EUR",
      });
    };
    window.addEventListener(CART_ADD_EVENT, onCartAdd);
    return () => window.removeEventListener(CART_ADD_EVENT, onCartAdd);
  }, [choice]);

  function choose(next: Choice) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ choice: next, at: Date.now() })); } catch {}
    if (next === "accepted") rememberConsentedFbclid(window.location.search);
    else try { sessionStorage.removeItem(FBCLID_STORAGE_KEY); } catch {}
    if (next === "refused" && choice === "accepted") {
      // A fresh document drops any listeners installed by the already loaded external script.
      window.location.reload();
      return;
    }
    setChoice(next);
    setOpen(false);
    window.dispatchEvent(new Event(MARKETING_CONSENT_CHANGED_EVENT));
  }

  if (!ready || !open) return null;
  return <section aria-label="Choix des cookies publicitaires" className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-xl rounded-2xl border border-line-strong bg-paper p-5 text-ink shadow-2xl sm:bottom-5 sm:p-6">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.12em] text-brand">Cookies publicitaires</p>
        <p className="mt-2 text-sm leading-relaxed text-ink-2">Avec ton accord, les pixels Snapchat et Meta mesurent les pages visitées et certaines actions (produit consulté, ajout au panier et début de commande) pour nos campagnes. Si tu arrives d’une publicité Meta, son identifiant de clic est conservé dans cet onglet et transmis au partenaire de paiement seulement avec ton accord sur le formulaire de commande. Le début de commande est envoyé comme événement InitiateCheckout à Meta ; le clic vers le paiement est envoyé comme START_CHECKOUT à Snapchat. Aucun achat n’est déclaré par la boutique à ce stade. Ils peuvent utiliser des cookies et transmettre des données de navigation à Snap et Meta. Ton choix est facultatif et n’affecte pas ta commande. <a className="underline underline-offset-2" href="https://values.snap.com/privacy/privacy-policy" target="_blank" rel="noopener noreferrer">Confidentialité de Snap</a> · <a className="underline underline-offset-2" href="https://www.facebook.com/privacy/policy/" target="_blank" rel="noopener noreferrer">Confidentialité de Meta</a>.</p>
      </div>
      {choice !== null && <button type="button" aria-label="Fermer les paramètres des cookies" className="text-xl leading-none text-muted hover:text-ink" onClick={() => setOpen(false)}>×</button>}
    </div>
    <div className="mt-4 grid grid-cols-2 gap-3">
      <button type="button" className="min-h-11 rounded-full border border-line-strong px-3 text-sm font-semibold hover:border-brand" onClick={() => choose("refused")}>Refuser</button>
      <button type="button" className="min-h-11 rounded-full border border-brand bg-brand px-3 text-sm font-semibold text-[#0b0b0c] hover:opacity-90" onClick={() => choose("accepted")}>Accepter</button>
    </div>
  </section>;
}

export function MarketingConsentSettingsButton() {
  return <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))} className="hover:text-ink">Cookies publicitaires</button>;
}
