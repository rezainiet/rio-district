"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useStore } from "./StoreProvider";
import { CartLineView } from "./CartLineView";
import { CartSummary } from "./CartSummary";
import { formatEUR } from "@/lib/money";
import { Button, ButtonLink } from "@/components/ui/Button";
import { BagIcon, CheckIcon, CloseIcon, ReturnIcon, TruckIcon } from "@/components/ui/icons";

export function CartDrawer() {
  const { drawerOpen, setDrawerOpen, lines, quote, config, lastAdded, productMap, products } = useStore();
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);
  // Kept mounted for the closing animation, then removed (CSS keyframes; reduced motion = instant).
  const [mounted, setMounted] = useState(drawerOpen);
  if (drawerOpen && !mounted) setMounted(true);
  useEffect(() => {
    if (drawerOpen || !mounted) return;
    const t = setTimeout(() => setMounted(false), 200);
    return () => clearTimeout(t);
  }, [drawerOpen, mounted]);

  useEffect(() => setDrawerOpen(false), [pathname, setDrawerOpen]);

  useEffect(() => {
    if (!drawerOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
      if (e.key === "Tab" && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), select, input, [tabindex]:not([tabindex="-1"])');
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    requestAnimationFrame(() => panelRef.current?.querySelector<HTMLElement>("button")?.focus());
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [drawerOpen, setDrawerOpen]);

  const hasErrors = lines.length !== quote.lines.length;
  // Set by add() and cleared when the drawer closes: only shown right after adding.
  const justAdded = lastAdded?.line ?? null;
  const addedText = justAdded
    ? justAdded.kind === "single"
      ? `${productMap.get(justAdded.productId)?.name ?? "Veste"} · taille ${justAdded.size}`
      : `${config.bundle.label} · ${justAdded.items.map((i) => `${productMap.get(i.productId)?.color.name ?? ""} ${i.size}`).join(" + ")}`
    : "";
  // Honest pack suggestion: a single jacket in the cart, and the real price difference.
  const single = lines.length === 1 && lines[0].kind === "single" && lines[0].quantity === 1 ? lines[0] : null;
  const singleProduct = single && single.kind === "single" ? productMap.get(single.productId) : undefined;
  const packExtra = singleProduct && config.bundle.enabled && singleProduct.bundleEligible ? config.bundle.priceCents - singleProduct.priceCents : 0;

  return (
    <>
      {mounted && (
        <div className="fixed inset-0 z-50" role="presentation">
          <div
            className={drawerOpen ? "drawer-fade-in absolute inset-0 bg-black/60" : "drawer-fade-out absolute inset-0 bg-black/60"}
            onClick={() => setDrawerOpen(false)}
          />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-title"
            className={`${drawerOpen ? "drawer-in" : "drawer-out"} absolute inset-y-0 right-0 flex w-full max-w-[440px] flex-col border-l border-line bg-paper shadow-[var(--shadow-pop)]`}
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <h2 id="cart-title" className="display text-[28px] uppercase">
                Ton panier <span className="text-muted">({quote.itemsCount})</span>
              </h2>
              <button type="button" onClick={() => setDrawerOpen(false)} className="-mr-2 grid size-11 place-items-center rounded-full hover:bg-paper-2" aria-label="Fermer le panier">
                <CloseIcon />
              </button>
            </div>

            {justAdded && (
              <p role="status" className="anim-pop mx-5 mt-4 flex items-start gap-3 rounded-xl border border-[#2c4a37] bg-[#132019] px-4 py-3 text-[15px]">
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-[#7fcb9c] text-[#0b0b0c]" aria-hidden>
                  <CheckIcon width={14} height={14} />
                </span>
                <span>
                  <span className="block font-semibold">Ajouté au panier</span>
                  <span className="block text-sm text-ink-2">{addedText}</span>
                </span>
              </p>
            )}

            {lines.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
                <span className="grid size-14 place-items-center rounded-full border border-line-strong text-muted"><BagIcon width={24} height={24} /></span>
                <p className="display text-[30px] uppercase">Ton panier est vide.</p>
                <p className="text-[15px] text-muted">
                  Six coloris, du XS au 3XL{config.bundle.enabled ? ` — et ${formatEUR(config.bundle.priceCents)} les deux` : ""}.
                </p>
                <ButtonLink href={products[0] ? `/produit/${products[0].slug}` : "/#collection"} size="lg" onClick={() => setDrawerOpen(false)}>
                  Voir les vestes
                </ButtonLink>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto overscroll-contain px-5">
                  <div className="divide-y divide-line">
                    {lines.map((line) => (
                      <CartLineView key={line.key} line={line} compact />
                    ))}
                  </div>
                  {packExtra > 0 && singleProduct && (
                    <Link
                      href={`/produit/${singleProduct.slug}?offre=pack#acheter`}
                      onClick={() => setDrawerOpen(false)}
                      className="tap mb-4 flex items-center justify-between gap-3 rounded-xl border border-[#4a3f2a] bg-[#17140f] px-4 py-3 text-sm"
                    >
                      <span>
                        <span className="block font-semibold">Une 2e veste pour {formatEUR(packExtra)} de plus</span>
                        <span className="block text-ink-2">{config.bundle.label} : {formatEUR(config.bundle.priceCents)} les deux, coloris au choix</span>
                      </span>
                      <span aria-hidden className="text-brand">→</span>
                    </Link>
                  )}
                </div>
                <div className="border-t border-line bg-paper-2 px-5 pb-[max(12px,env(safe-area-inset-bottom))] pt-3">
                  <CartSummary quote={quote} />
                  <ul className="mt-2.5 grid gap-1 text-[13px] leading-snug text-ink-2">
                    <li className="flex items-center gap-2"><TruckIcon width={16} height={16} className="shrink-0 text-brand" /> Livrée {config.deliveryEstimate} pour une commande aujourd&apos;hui</li>
                    <li className="flex items-center gap-2"><ReturnIcon width={16} height={16} className="shrink-0 text-brand" /> Retour possible sous {config.returnsWindowDays} jours après réception</li>
                  </ul>
                  <div className="mt-3 grid gap-1.5">
                    <ButtonLink
                      href="/commande"
                      size="lg"
                      className="h-14 w-full"
                      aria-disabled={hasErrors || !config.acceptingOrders}
                      onClick={(e) => {
                        if (hasErrors) e.preventDefault();
                      }}
                    >
                      Commander · {formatEUR(quote.totalCents)}
                    </ButtonLink>
                    <Button variant="ghost" className="h-11 w-full hover:bg-paper-3" onClick={() => setDrawerOpen(false)}>
                      Continuer mes achats
                    </Button>
                    <p className="text-center text-[13px] text-muted">
                      Demande de commande · rien à payer aujourd&apos;hui ·{" "}
                      <Link href="/panier" className="underline underline-offset-4 hover:text-ink">panier détaillé</Link>
                    </p>
                  </div>
                  {hasErrors && <p className="mt-2 text-sm text-danger">Corrige les articles signalés pour continuer.</p>}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
