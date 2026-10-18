"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const PIXEL_ID = "25924406-58d9-4767-9b28-e91773f5ba30";
const SCRIPT_URL = "https://sc-static.net/scevent.min.js";
const STORAGE_KEY = "rd.snap-consent.v1";
const CHOICE_LIFETIME_MS = 180 * 24 * 60 * 60 * 1000;
const OPEN_EVENT = "rio:snap-consent-open";

type Choice = "accepted" | "refused";
type Snaptr = ((...args: unknown[]) => void) & { queue?: unknown[][]; handleRequest?: (...args: unknown[]) => void };

declare global {
  interface Window { snaptr?: Snaptr; }
}

function savedChoice(): Choice | null {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if ((data?.choice === "accepted" || data?.choice === "refused") &&
        typeof data.at === "number" && Date.now() - data.at < CHOICE_LIFETIME_MS && data.at <= Date.now()) return data.choice;
  } catch { /* Storage can be unavailable in private browsing. */ }
  return null;
}

function startPixel() {
  if (!window.snaptr) {
    const snaptr = ((...args: unknown[]) => {
      if (snaptr.handleRequest) snaptr.handleRequest(...args);
      else snaptr.queue!.push(args);
    }) as Snaptr;
    snaptr.queue = [];
    window.snaptr = snaptr;
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.dataset.rioSnapPixel = "true";
    document.head.appendChild(script);
    snaptr("init", PIXEL_ID, {});
  }
}

export function SnapPixel() {
  const pathname = usePathname();
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
    startPixel();
    if (trackedPath.current !== pathname) {
      window.snaptr?.("track", "PAGE_VIEW");
      trackedPath.current = pathname;
    }
  }, [ready, choice, pathname]);

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
        <p className="mt-2 text-sm leading-relaxed text-ink-2">Avec ton accord, le pixel Snapchat mesure les pages visitées pour nos campagnes. Il peut utiliser des cookies et transmettre des données de navigation à Snap. Ton choix est facultatif et n’affecte pas ta commande. <a className="underline underline-offset-2" href="https://values.snap.com/privacy/privacy-policy" target="_blank" rel="noopener noreferrer">Confidentialité de Snap</a>.</p>
      </div>
      {choice !== null && <button type="button" aria-label="Fermer les paramètres des cookies" className="text-xl leading-none text-muted hover:text-ink" onClick={() => setOpen(false)}>×</button>}
    </div>
    <div className="mt-4 grid grid-cols-2 gap-3">
      <button type="button" className="min-h-11 rounded-full border border-line-strong px-3 text-sm font-semibold hover:border-brand" onClick={() => choose("refused")}>Refuser</button>
      <button type="button" className="min-h-11 rounded-full border border-brand bg-brand px-3 text-sm font-semibold text-[#0b0b0c] hover:opacity-90" onClick={() => choose("accepted")}>Accepter</button>
    </div>
  </section>;
}

export function SnapConsentSettingsButton() {
  return <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))} className="hover:text-ink">Cookies publicitaires</button>;
}
