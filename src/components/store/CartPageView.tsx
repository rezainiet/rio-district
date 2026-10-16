"use client";
import { formatEUR } from "@/lib/money";

import { useStore } from "./StoreProvider";
import { CartLineView } from "./CartLineView";
import { CartSummary } from "./CartSummary";
import { ButtonLink } from "@/components/ui/Button";
import { InfoIcon } from "@/components/ui/icons";

export function CartPageView() {
  const { lines, quote, hydrated, config } = useStore();
  const hasErrors = lines.length !== quote.lines.length;

  return (
    <div className="container-x py-10 md:py-16">
      <h1 className="display text-[30px] uppercase sm:text-[40px] md:text-[60px]">Panier</h1>

      {!hydrated ? (
        <div className="mt-10 grid gap-4" aria-busy="true" aria-label="Chargement du panier">
          {[0, 1].map((i) => (
            <div key={i} className="h-36 animate-pulse rounded-[var(--radius-md)] bg-paper-2" />
          ))}
        </div>
      ) : lines.length === 0 ? (
        <div className="mt-10 rounded-[var(--radius-md)] border border-dashed border-line-strong px-6 py-16 text-center">
          <p className="display text-4xl">Ton panier est vide.</p>
          <p className="mt-2 text-muted">Choisis ta couleur — ou deux, c&apos;est {formatEUR(config.bundle.priceCents)} le pack.</p>
          <ButtonLink href="/#collection" className="mt-6">Voir la collection</ButtonLink>
        </div>
      ) : (
        <div className="mt-8 grid gap-10 lg:grid-cols-12">
          <div className="divide-y divide-line border-y border-line lg:col-span-7">
            {lines.map((line) => (
              <CartLineView key={line.key} line={line} />
            ))}
          </div>
          <aside className="lg:col-span-5" aria-label="Récapitulatif">
            <div className="rounded-[var(--radius-md)] border border-line bg-paper-2 p-5 lg:sticky lg:top-24 md:p-6">
              <h2 className="eyebrow mb-4 text-muted">Récapitulatif</h2>
              <CartSummary quote={quote} shippingLabel={config.shippingSummary.split(",")[0]} />
              <ButtonLink
                href="/commande"
                size="lg"
                className="mt-6 w-full"
                aria-disabled={hasErrors || !config.acceptingOrders}
                onClick={(e) => {
                  if (hasErrors || !config.acceptingOrders) e.preventDefault();
                }}
              >
                Continuer vers la commande
              </ButtonLink>
              {hasErrors && <p className="mt-2 text-sm text-danger">Certains articles ne sont plus disponibles : modifie-les ou retire-les.</p>}
              {!config.acceptingOrders && <p className="mt-2 text-sm text-muted">{config.closedMessage}</p>}
              <p className="mt-4 flex gap-2 text-xs leading-relaxed text-muted">
                <InfoIcon width={16} height={16} className="mt-px shrink-0" />
                {config.paymentNotice}
              </p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
