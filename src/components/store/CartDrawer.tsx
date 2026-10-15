"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useStore } from "./StoreProvider";
import { CartLineView } from "./CartLineView";
import { CartSummary } from "./CartSummary";
import { ButtonLink } from "@/components/ui/Button";
import { CloseIcon } from "@/components/ui/icons";

export function CartDrawer() {
  const { drawerOpen, setDrawerOpen, lines, quote, config } = useStore();
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => setDrawerOpen(false), [pathname, setDrawerOpen]);

  useEffect(() => {
    if (!drawerOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
      if (e.key === "Tab" && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), select, input, [tabindex]:not([tabindex="-1"])',
        );
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

  return (
    <AnimatePresence>
      {drawerOpen && (
        <div className="fixed inset-0 z-50" role="presentation">
          <motion.div
            className="absolute inset-0 bg-ink/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.2 }}
            onClick={() => setDrawerOpen(false)}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-title"
            className="absolute inset-y-0 right-0 flex w-full max-w-[440px] flex-col bg-paper shadow-[var(--shadow-pop)]"
            initial={{ x: reduce ? 0 : "100%" }}
            animate={{ x: 0 }}
            exit={{ x: reduce ? 0 : "100%" }}
            transition={{ type: "tween", duration: reduce ? 0 : 0.32, ease: [0.2, 0.7, 0.2, 1] }}
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 id="cart-title" className="display text-3xl">
                Panier <span className="text-muted">({quote.itemsCount})</span>
              </h2>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="-mr-2 grid size-11 place-items-center rounded-full hover:bg-paper-2"
                aria-label="Fermer le panier"
              >
                <CloseIcon />
              </button>
            </div>

            {lines.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-5 px-8 text-center">
                <p className="display text-4xl text-ink/80">Ton panier est vide.</p>
                <p className="text-sm text-muted">Six coloris t&apos;attendent. Et c&apos;est 24,95 € les deux.</p>
                <ButtonLink href="/#collection" onClick={() => setDrawerOpen(false)}>
                  Voir la collection
                </ButtonLink>
              </div>
            ) : (
              <>
                <div className="flex-1 divide-y divide-line overflow-y-auto px-5">
                  {lines.map((line) => (
                    <CartLineView key={line.key} line={line} compact />
                  ))}
                </div>
                <div className="border-t border-line bg-paper-2/60 px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-4">
                  <CartSummary quote={quote} />
                  <div className="mt-4 grid gap-2">
                    <ButtonLink
                      href="/commande"
                      size="lg"
                      className="w-full"
                      aria-disabled={hasErrors || !config.acceptingOrders}
                      onClick={(e) => {
                        if (hasErrors) e.preventDefault();
                      }}
                    >
                      Passer commande
                    </ButtonLink>
                    <p className="text-center text-[11px] text-muted">Demande de commande · aucun paiement aujourd&apos;hui</p>
                    <ButtonLink href="/panier" variant="ghost" size="sm" className="w-full">
                      Voir le panier détaillé
                    </ButtonLink>
                  </div>
                  {hasErrors && (
                    <p className="mt-2 text-xs text-danger">Corrige les articles signalés pour continuer.</p>
                  )}
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
