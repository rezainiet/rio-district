"use client";
import { formatEUR } from "@/lib/money";

import { useStore } from "./StoreProvider";
import { CartLineView } from "./CartLineView";
import { CartSummary } from "./CartSummary";
import { ButtonLink } from "@/components/ui/Button";
import { InfoIcon, ReturnIcon, TruckIcon } from "@/components/ui/icons";

export function CartPageView() {
  const { lines, quote, hydrated, config } = useStore();
  const hasErrors = lines.length !== quote.lines.length;

  return (
    <div className="container-x py-6 md:py-12">
      <h1 className="display t-title uppercase">Ton panier</h1>

      {!hydrated ? (
        <div className="mt-10 grid gap-4" aria-busy="true" aria-label="Chargement du panier">
          {[0, 1].map((i) => (
            <div key={i} className="h-36 animate-pulse rounded-[var(--radius-md)] bg-paper-2" />
          ))}
        </div>
      ) : lines.length === 0 ? (
        <div className="mt-10 rounded-[var(--radius-md)] border border-dashed border-line-strong px-6 py-16 text-center">
          <p className="display text-[30px] uppercase">Ton panier est vide.</p>
          <p className="mt-2 text-muted">Choisis ta couleur — ou deux, c&apos;est {formatEUR(config.bundle.priceCents)} le pack.</p>
          <ButtonLink href="/#collection" size="lg" className="mt-6">Voir les vestes</ButtonLink>
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
              <h2 className="mb-4 text-[13px] font-semibold uppercase tracking-[0.12em] text-muted">Récapitulatif</h2>
              <CartSummary quote={quote} />
              <ButtonLink
                href="/commande"
                size="lg"
                className="mt-6 h-14 w-full"
                aria-disabled={hasErrors || !config.acceptingOrders}
                onClick={(e) => {
                  if (hasErrors || !config.acceptingOrders) e.preventDefault();
                }}
              >
                Commander · {formatEUR(quote.totalCents)}
              </ButtonLink>
              {hasErrors && <p className="mt-2 text-sm text-danger">Certains articles ne sont plus disponibles : modifie-les ou retire-les.</p>}
              {!config.acceptingOrders && <p className="mt-2 text-sm text-muted">{config.closedMessage}</p>}
              <ul className="mt-4 grid gap-2 text-sm text-ink-2">
                <li className="flex gap-2"><TruckIcon width={17} height={17} className="mt-0.5 shrink-0 text-brand" /> Livrée {config.deliveryEstimate} pour une commande aujourd&apos;hui</li>
                <li className="flex gap-2"><ReturnIcon width={17} height={17} className="mt-0.5 shrink-0 text-brand" /> Retour possible sous {config.returnsWindowDays} jours après réception</li>
                <li className="flex gap-2"><InfoIcon width={17} height={17} className="mt-0.5 shrink-0 text-brand" /> Rien à payer aujourd&apos;hui : commande confirmée par e-mail</li>
              </ul>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
