import Image from "next/image";
import Link from "next/link";
import { formatEUR } from "@/lib/money";
import { artClass } from "@/lib/image-fit";
import type { BundleConfig, PublicProduct } from "@/lib/types";

/** Product card: photo, colour, price, pack price and a visible "Choisir" action (no hover-only UI). */
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
      className="tap group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-paper-2 hover:border-line-strong focus-visible:outline-offset-4"
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
            className={`object-cover transition-transform duration-500 ease-[var(--ease-out-soft)] ${artClass(front, "card")}`}
          />
        )}
        {soldOut && <span className="absolute left-3 top-3 z-10 rounded-full bg-paper px-3 py-1.5 text-[13px] font-semibold">Épuisé</span>}
      </div>

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <p className="flex items-center gap-1.5 text-[13px] font-medium text-ink-2">
          <span className="size-2.5 rounded-full ring-1 ring-white/25" style={{ background: product.color.hex }} aria-hidden />
          {product.color.name}
        </p>
        <h3 className="display mt-1 text-[19px] uppercase leading-tight sm:text-[22px]">{product.name}</h3>
        <p className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
          <span className="price text-[20px]">{formatEUR(product.priceCents)}</span>
          {showBundle && <span className="text-[13px] text-brand">ou {bundle.quantity} pour {formatEUR(bundle.priceCents)}</span>}
        </p>
        <span className="mt-auto pt-3">
          <span className="flex min-h-11 items-center justify-center rounded-full border border-line-strong text-[14px] font-semibold transition-colors group-hover:border-ink group-hover:bg-ink group-hover:text-paper">
            {soldOut ? "Voir la fiche" : "Choisir"}
          </span>
        </span>
      </div>
    </Link>
  );
}
