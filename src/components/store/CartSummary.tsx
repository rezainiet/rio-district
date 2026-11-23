"use client";

import { formatEUR } from "@/lib/money";
import type { CartQuote } from "@/lib/types";
import { useT } from "@/i18n/client";

export function CartSummary({ quote, shippingLabel }: { quote: CartQuote; shippingLabel?: string }) {
  const { t } = useT();
  return (
    <dl className="space-y-1.5 text-[15px]">
      <div className="flex justify-between">
        <dt className="text-muted">{quote.itemsCount > 1 ? t("Sous-total ({n} articles)", { n: quote.itemsCount }) : t("Sous-total ({n} article)", { n: quote.itemsCount })}</dt>
        <dd className="tabular-nums">{formatEUR(quote.subtotalCents)}</dd>
      </div>
      {quote.discountCents > 0 && (
        <div className="flex justify-between text-[#8fd9ad]">
          <dt>{t("Remise pack")}</dt>
          <dd className="tabular-nums">−{formatEUR(quote.discountCents)}</dd>
        </div>
      )}
      <div className="flex justify-between">
        <dt className="text-muted">{t("Livraison")}{shippingLabel ? ` · ${shippingLabel}` : ""}</dt>
        <dd className="tabular-nums">{quote.shippingCents === 0 ? t("Offerte") : formatEUR(quote.shippingCents)}</dd>
      </div>
      <div className="flex items-baseline justify-between border-t border-line pt-2.5">
        <dt className="font-semibold">{t("Total TTC")}</dt>
        <dd className="price text-[28px] leading-none">{formatEUR(quote.totalCents)}</dd>
      </div>
    </dl>
  );
}
