import Image from "next/image";
import Link from "next/link";
import { formatEUR } from "@/lib/money";
import { artClass } from "@/lib/image-fit";
import type { BundleConfig, PublicProduct } from "@/lib/types";
import { ArrowRight } from "@/components/ui/icons";

export function ProductCard({
  product,
  bundle,
  priority = false,
}: {
  product: PublicProduct;
  bundle: BundleConfig;
  priority?: boolean;
}) {
  const [front, back] = product.images;
  const soldOut = product.sizes.length > 0 && product.sizes.every((s) => !s.available);
  const showBundle = bundle.enabled && product.bundleEligible && !soldOut;

  return (
    <Link
      href={`/produit/${product.slug}`}
      className="group block focus-visible:outline-offset-4"
      aria-label={`${product.name}, ${formatEUR(product.priceCents)}${showBundle ? `, ou ${bundle.quantity} pour ${formatEUR(bundle.priceCents)}` : ""}`}
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-[var(--radius-md)] bg-studio">
        {front && (
          <Image
            src={front.url}
            alt={front.alt}
            fill
            priority={priority}
            sizes="(min-width: 1024px) 30vw, 50vw"
            className={`object-cover transition-[opacity,transform] duration-700 ease-[var(--ease-out-soft)] ${artClass(front, "card")}`}
          />
        )}
        {back && (
          <Image
            src={back.url}
            alt=""
            aria-hidden
            fill
            sizes="(min-width: 1024px) 30vw, 50vw"
            className={`object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100 max-md:hidden ${artClass(back, "thumb")}`}
          />
        )}
        {soldOut && (
          <span className="eyebrow absolute left-3 top-3 rounded-full bg-ink px-2.5 py-1 text-[10px] text-paper">Épuisé</span>
        )}
        <span className="absolute inset-x-3 bottom-3 hidden translate-y-2 items-center justify-between rounded-[var(--radius-sm)] bg-ink px-4 py-3 text-paper opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 md:flex">
          <span className="eyebrow">Choisir ma taille</span>
          <ArrowRight width={16} height={16} />
        </span>
      </div>

      <div className="mt-3 flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-[15px] font-bold uppercase leading-tight [font-variation-settings:'wdth'_88] sm:text-base">
            {product.name}
          </h3>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
            <span className="size-2.5 rounded-full ring-1 ring-black/15" style={{ background: product.color.hex }} aria-hidden />
            {product.color.name}
          </p>
        </div>
        <div className="shrink-0 sm:text-right">
          <p className="price text-lg">{formatEUR(product.priceCents)}</p>
          {showBundle && (
            <p className="text-[11px] font-medium text-brand">
              ou {bundle.quantity} pour {formatEUR(bundle.priceCents)}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
