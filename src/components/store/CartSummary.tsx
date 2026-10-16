import { formatEUR } from "@/lib/money";
import type { CartQuote } from "@/lib/types";

export function CartSummary({ quote, shippingLabel }: { quote: CartQuote; shippingLabel?: string }) {
  return (
    <dl className="space-y-1.5 text-[15px]">
      <div className="flex justify-between">
        <dt className="text-muted">Sous-total ({quote.itemsCount} article{quote.itemsCount > 1 ? "s" : ""})</dt>
        <dd className="tabular-nums">{formatEUR(quote.subtotalCents)}</dd>
      </div>
      {quote.discountCents > 0 && (
        <div className="flex justify-between text-[#8fd9ad]">
          <dt>Remise pack</dt>
          <dd className="tabular-nums">−{formatEUR(quote.discountCents)}</dd>
        </div>
      )}
      <div className="flex justify-between">
        <dt className="text-muted">Livraison{shippingLabel ? ` · ${shippingLabel}` : ""}</dt>
        <dd className="tabular-nums">{quote.shippingCents === 0 ? "Offerte" : formatEUR(quote.shippingCents)}</dd>
      </div>
      <div className="flex items-baseline justify-between border-t border-line pt-2.5">
        <dt className="font-semibold">Total TTC</dt>
        <dd className="price text-[28px] leading-none">{formatEUR(quote.totalCents)}</dd>
      </div>
    </dl>
  );
}
