"use client";
import { formatEUR } from "@/lib/money";

import { useStore } from "./StoreProvider";
import { CartLineView } from "./CartLineView";
import { CartSummary } from "./CartSummary";
import { ButtonLink } from "@/components/ui/Button";
import { InfoIcon, ReturnIcon, TruckIcon } from "@/components/ui/icons";
import { useT } from "@/i18n/client";

export function CartPageView() {
  const { lines, quote, hydrated, config } = useStore();
  const { t, href } = useT();
  const hasErrors = lines.length !== quote.lines.length;

  return (
    <div className="container-x py-6 md:py-12">
      <h1 className="display t-title uppercase">{t("Ton panier")}</h1>

      {!hydrated ? (
        <div className="mt-10 grid gap-4" aria-busy="true" aria-label={t("Chargement du panier")}>
          {[0, 1].map((i) => (
            <div key={i} className="h-36 animate-pulse rounded-[var(--radius-md)] bg-paper-2" />
          ))}
        </div>
      ) : lines.length === 0 ? (
        <div className="mt-10 rounded-[var(--radius-md)] border border-dashed border-line-strong px-6 py-16 text-center">
          <p className="display text-[30px] uppercase">{t("Ton panier est vide.")}</p>
          <p className="mt-2 text-muted">{t("Choisis ta couleur — ou deux, c'est {price} le pack.", { price: formatEUR(config.bundle.priceCents) })}</p>
          <ButtonLink href={href("/#collection")} size="lg" className="mt-6">{t("Voir les vestes")}</ButtonLink>
        </div>
      ) : (
        <div className="mt-8 grid gap-10 lg:grid-cols-12">
          <div className="divide-y divide-line border-y border-line lg:col-span-7">
            {lines.map((line) => (
              <CartLineView key={line.key} line={line} />
            ))}
          </div>
          <aside className="lg:col-span-5" aria-label={t("Récapitulatif")}>
            <div className="rounded-[var(--radius-md)] border border-line bg-paper-2 p-5 lg:sticky lg:top-24 md:p-6">
              <h2 className="mb-4 text-[13px] font-semibold uppercase tracking-[0.12em] text-muted">{t("Récapitulatif")}</h2>
              <CartSummary quote={quote} />
              <ButtonLink
                href={href("/commande")}
                size="lg"
                className="mt-6 h-14 w-full"
                aria-disabled={hasErrors || !config.acceptingOrders}
                onClick={(e) => {
                  if (hasErrors || !config.acceptingOrders) e.preventDefault();
                }}
              >
                {t("Commander · {total}", { total: formatEUR(quote.totalCents) })}
              </ButtonLink>
              {hasErrors && <p className="mt-2 text-sm text-danger">{t("Certains articles ne sont plus disponibles : modifie-les ou retire-les.")}</p>}
              {!config.acceptingOrders && <p className="mt-2 text-sm text-muted">{config.closedMessage}</p>}
              <ul className="mt-4 grid gap-2 text-sm text-ink-2">
                <li className="flex gap-2"><TruckIcon width={17} height={17} className="mt-0.5 shrink-0 text-brand" /> {t("Livrée {date} pour une commande aujourd'hui", { date: config.deliveryEstimate })}</li>
                <li className="flex gap-2"><ReturnIcon width={17} height={17} className="mt-0.5 shrink-0 text-brand" /> {t("Retour possible sous {n} jours après réception", { n: config.returnsWindowDays })}</li>
                <li className="flex gap-2"><InfoIcon width={17} height={17} className="mt-0.5 shrink-0 text-brand" /> {config.checkout && config.checkout.mode !== "request" ? t("Coordonnées ici, puis paiement chez notre partenaire externe") : t("Rien à payer aujourd’hui : commande confirmée par e-mail")}</li>
              </ul>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
