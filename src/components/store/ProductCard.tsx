import Image from "next/image";
import Link from "next/link";
import { formatEUR } from "@/lib/money";
import { artClass } from "@/lib/image-fit";
import type { BundleConfig, PublicProduct } from "@/lib/types";
import type { RatingSummary } from "@/lib/marketing";
import { Stars } from "./Stars";

/** Product card: photo, colour, price, pack price and a visible "Choisir" action (no hover-only UI). */
export function ProductCard({
  product,
  bundle,
  priority = false,
  rating,
}: {
  product: PublicProduct;
  bundle: BundleConfig;
  priority?: boolean;
  rating?: RatingSummary;
}) {
  const [front] = product.images;
  const soldOut = product.sizes.length > 0 && product.sizes.every((s) => !s.available);
  const showBundle = bundle.enabled && product.bundleEligible && !soldOut;

  return (
    <Link
      href={`/produit/${product.slug}`}
      className="product-editorial-card group flex h-full flex-col focus-visible:outline-offset-4"
      aria-label={`${product.name}, ${formatEUR(product.priceCents)}${showBundle ? `, ou ${bundle.quantity} pour ${formatEUR(bundle.priceCents)}` : ""}`}
    >
      <div className="product-editorial-photo relative aspect-[4/5] overflow-hidden rounded-2xl">
        {front && (
          <Image
            src={front.url}
            alt={front.alt}
            fill
            priority={priority}
            sizes="(min-width: 1024px) 30vw, 50vw"
            className={`object-cover transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.04] ${artClass(front, "card")}`}
          />
        )}
        {soldOut && <span className="absolute left-3 top-3 z-10 rounded-full bg-paper px-3 py-1.5 text-[13px] font-semibold">Épuisé</span>}
        {!soldOut && showBundle && <span className="card-duo-badge">Offre duo</span>}
        <span className="card-color-badge"><span style={{background:product.color.hex}} />{product.color.name}</span>
      </div>

      <div className="flex flex-1 flex-col pt-3 sm:pt-5">
        {rating && rating.count > 0 && <div className="card-rating"><Stars value={rating.average} size={12} /><span>{rating.average.toLocaleString("fr-FR",{maximumFractionDigits:1})} · {rating.count} avis sur le modèle</span></div>}
        <h3 className="display mt-2 text-[20px] uppercase leading-tight sm:text-[28px]">{product.name}</h3>
        <p className="mt-3 price text-[24px] sm:text-[28px]">{formatEUR(product.priceCents)}</p>
        {showBundle && <p className="mt-0.5 text-[12px] text-muted sm:text-sm">ou <strong className="font-semibold text-brand">{bundle.quantity} pour {formatEUR(bundle.priceCents)}</strong></p>}
        <span className="mt-auto pt-3">
          <span className="card-cta">
            {soldOut ? "Voir la fiche" : "Je la veux"}<span aria-hidden="true">↗</span>
          </span>
        </span>
      </div>
    </Link>
  );
}
