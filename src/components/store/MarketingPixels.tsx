"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useStore } from "./StoreProvider";

const SNAP_PIXEL_ID = "25924406-58d9-4767-9b28-e91773f5ba30";
const META_PIXEL_ID = "1378153049835069";
const SNAP_SCRIPT_URL = "https://sc-static.net/scevent.min.js";
const META_SCRIPT_URL = "https://connect.facebook.net/en_US/fbevents.js";
// New choice: existing Snapchat consent did not cover Meta.
const STORAGE_KEY = "rd.marketing-consent.v1";
const CHOICE_LIFETIME_MS = 180 * 24 * 60 * 60 * 1000;
const OPEN_EVENT = "rio:marketing-consent-open";
const CART_ADD_EVENT = "rio:cart-add";

type Choice = "accepted" | "refused";
type Snaptr = ((...args: unknown[]) => void) & { queue?: unknown[][]; handleRequest?: (...args: unknown[]) => void };
type Fbq = ((...args: unknown[]) => void) & { queue?: unknown[][]; callMethod?: (...args: unknown[]) => void; push?: Fbq; loaded?: boolean; version?: string };

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
    window.fbq = window._fbq = fbq;
    const script = document.createElement("script");
    script.src = META_SCRIPT_URL;
    script.async = true;
    script.dataset.rioMetaPixel = "true";
    document.head.appendChild(script);
    fbq("init", META_PIXEL_ID);
  }
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
    startPixels();
    if (trackedPath.current !== pathname) {
      window.snaptr?.("track", "PAGE_VIEW");
      window.fbq?.("trackSingle", META_PIXEL_ID, "PageView");
      const product = products.find(item => pathname === `/produit/${item.slug}`);
      if (product) window.fbq?.("trackSingle", META_PIXEL_ID, "ViewContent", {
        content_ids: [product.id], content_type: "product", value: product.priceCents / 100, currency: product.currency ?? "EUR",
      });
      if (pathname === "/commande") window.fbq?.("trackSingle", META_PIXEL_ID, "InitiateCheckout");
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
    if (next === "refused" && choice === "accepted") {
      // A fresh document drops any listeners installed by the already loaded external script.
      window.location.reload();
      return;
    }
    setChoice(next);
    setOpen(false);
  }

  if (!ready || !open) return null;
  return <section aria-label="Choix des cookies publicitaires" className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-xl rounded-2xl border border-line-strong bg-paper p-5 text-ink shadow-2xl sm:bottom-5 sm:p-6">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.12em] text-brand">Cookies publicitaires</p>
        <p className="mt-2 text-sm leading-relaxed text-ink-2">Avec ton accord, les pixels Snapchat et Meta mesurent les pages visitées et certaines actions (produit consulté, ajout au panier, début de commande) pour nos campagnes. Ils peuvent utiliser des cookies et transmettre des données de navigation à Snap et Meta. Ton choix est facultatif et n’affecte pas ta commande. <a className="underline underline-offset-2" href="https://values.snap.com/privacy/privacy-policy" target="_blank" rel="noopener noreferrer">Confidentialité de Snap</a> · <a className="underline underline-offset-2" href="https://www.facebook.com/privacy/policy/" target="_blank" rel="noopener noreferrer">Confidentialité de Meta</a>.</p>
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
