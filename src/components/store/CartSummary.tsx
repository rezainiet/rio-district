import { formatEUR } from "@/lib/money";
import type { CartQuote } from "@/lib/types";

export function CartSummary({ quote, shippingLabel }: { quote: CartQuote; shippingLabel?: string }) {
  return (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between">
        <dt className="text-muted">Sous-total ({quote.itemsCount} article{quote.itemsCount > 1 ? "s" : ""})</dt>
        <dd className="tabular-nums">{formatEUR(quote.subtotalCents)}</dd>
      </div>
      {quote.discountCents > 0 && (
        <div className="flex justify-between text-brand">
          <dt>Remise pack</dt>
          <dd className="tabular-nums">−{formatEUR(quote.discountCents)}</dd>
        </div>
      )}
      <div className="flex justify-between">
        <dt className="text-muted">Livraison{shippingLabel ? ` · ${shippingLabel}` : ""}</dt>
        <dd className="tabular-nums">{quote.shippingCents === 0 ? "Offerte" : formatEUR(quote.shippingCents)}</dd>
      </div>
      <div className="flex items-baseline justify-between border-t border-line pt-3">
        <dt className="eyebrow">Total TTC</dt>
        <dd className="price text-2xl">{formatEUR(quote.totalCents)}</dd>
      </div>
    </dl>
  );
}
