import Image from "next/image";
import Link from "next/link";
import { formatEUR } from "@/lib/money";
import { artClass } from "@/lib/image-fit";
import type { BundleConfig, PublicProduct } from "@/lib/types";

/** Dark Premium product card: rounded panel, spotlit square photo, ivory CTA bar on hover. */
export function ProductCard({
  product,
  bundle,
  priority = false,
}: {
  product: PublicProduct;
  bundle: BundleConfig;
  priority?: boolean;
}) {
  const [front] = product.images;
  const soldOut = product.sizes.length > 0 && product.sizes.every((s) => !s.available);
  const showBundle = bundle.enabled && product.bundleEligible && !soldOut;

  return (
    <Link
      href={`/produit/${product.slug}`}
      className="group block overflow-hidden rounded-2xl border border-line bg-paper-2 transition-colors hover:border-brand focus-visible:outline-offset-4"
      aria-label={`${product.name}, ${formatEUR(product.priceCents)}${showBundle ? `, ou ${bundle.quantity} pour ${formatEUR(bundle.priceCents)}` : ""}`}
    >
      <div className="shot relative aspect-square">
        {front && (
          <Image
            src={front.url}
            alt={front.alt}
            fill
            priority={priority}
            sizes="(min-width: 1024px) 30vw, 50vw"
            className={`object-cover transition-transform duration-700 ease-[var(--ease-out-soft)] ${artClass(front, "card")}`}
          />
        )}
        {soldOut && (
          <span className="lab absolute left-4 top-4 z-10 rounded-full bg-paper px-3 py-1.5 text-ink">Épuisé</span>
        )}
      </div>

      <div className="flex flex-col gap-2 p-4 sm:flex-row sm:items-end sm:justify-between sm:p-5">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{product.color.name}</p>
          <h3 className="mt-2 font-display text-[15px] font-bold uppercase leading-tight sm:text-xl">{product.name}</h3>
        </div>
        <div className="shrink-0 sm:text-right">
          <p className="text-base font-semibold sm:text-lg">{formatEUR(product.priceCents)}</p>
          {showBundle && (
            <p className="mt-1 text-xs text-brand">
              ou {bundle.quantity} pour {formatEUR(bundle.priceCents)}
            </p>
          )}
        </div>
      </div>
      <div className="hidden max-h-0 items-center justify-between overflow-hidden bg-ink px-5 text-sm font-semibold text-paper transition-[max-height,padding] duration-300 group-hover:max-h-14 group-hover:py-3.5 md:flex">
        <span>Choisir ma taille</span>
        <span aria-hidden>→</span>
      </div>
    </Link>
  );
}
