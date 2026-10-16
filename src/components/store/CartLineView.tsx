"use client";

import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";
import { priceCart } from "@/lib/pricing";
import { formatEUR } from "@/lib/money";
import type { Size } from "@/lib/sizes";
import type { PublicProduct } from "@/lib/types";
import { toInput, useStore, type CartLine } from "./StoreProvider";
import { MinusIcon, PlusIcon } from "@/components/ui/icons";

/** Products a cart item can be switched to (same model, other colours). */
function colourOptions(products: PublicProduct[], current: PublicProduct | undefined, bundleOnly: boolean) {
  return products.filter(
    (p) => (!current?.group || p.group === current.group) && (!bundleOnly || p.bundleEligible),
  );
}

function ItemEditor({
  label,
  productId,
  size,
  bundleOnly,
  onChange,
}: {
  label?: string;
  productId: string;
  size: Size;
  bundleOnly: boolean;
  onChange: (productId: string, size: Size) => void;
  compact?: boolean;
}) {
  const { products, productMap } = useStore();
  const product = productMap.get(productId);
  const options = colourOptions(products, product, bundleOnly);
  const id = `${productId}-${label ?? "item"}`;

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      {label && <span className="w-full text-[13px] font-semibold uppercase tracking-[0.1em] text-muted">{label}</span>}
      <label className="sr-only" htmlFor={`${id}-color`}>Couleur</label>
      <select
        id={`${id}-color`}
        value={productId}
        onChange={(e) => {
          const next = productMap.get(e.target.value);
          const keep = next?.sizes.find((s) => s.label === size && s.available);
          const fallback = next?.sizes.find((s) => s.available)?.label ?? size;
          onChange(e.target.value, keep ? size : fallback);
        }}
        className="h-11 rounded-[var(--radius-sm)] border border-line-strong bg-paper-3 pl-3 pr-8 text-[15px]"
      >
        {!product && <option value={productId}>Indisponible</option>}
        {options.map((p) => (
          <option key={p.id} value={p.id}>
            {p.color.name || p.name}
          </option>
        ))}
      </select>
      <label className="sr-only" htmlFor={`${id}-size`}>Taille</label>
      <select
        id={`${id}-size`}
        value={size}
        onChange={(e) => onChange(productId, e.target.value as Size)}
        className="h-11 rounded-[var(--radius-sm)] border border-line-strong bg-paper-3 pl-3 pr-8 text-[15px]"
      >
        {(product?.sizes ?? []).map((s) => (
          <option key={s.label} value={s.label} disabled={!s.available}>
            {s.label}
            {!s.available ? " — épuisé" : ""}
          </option>
        ))}
      </select>
    </div>
  );
}

export function CartLineView({ line, compact = false }: { line: CartLine; compact?: boolean }) {
  const { productMap, config, update, remove, setQuantity } = useStore();
  const priced = priceCart([toInput(line)], productMap, config.bundle, 0);
  const pl = priced.lines[0];
  const error = priced.errors[0]?.message;

  const refs = line.kind === "single" ? [{ productId: line.productId, size: line.size }] : line.items;
  const images = refs.map((r) => productMap.get(r.productId)?.images[0]).filter(Boolean);
  const first = productMap.get(refs[0].productId);

  return (
    <article className={clsx("flex gap-4", compact ? "py-4" : "py-6")} aria-label={pl?.label ?? "Article"}>
      <div className={clsx("relative shrink-0 self-start", compact ? "w-20" : "w-24 sm:w-28")}>
        <div className="relative aspect-[4/5] overflow-hidden rounded-[var(--radius-sm)] bg-studio">
          {images[0] && <Image src={images[0].url} alt={images[0].alt} fill sizes="112px" className="object-cover" />}
        </div>
        {images[1] && (
          <div className="absolute -bottom-2 -right-2 aspect-[4/5] w-1/2 overflow-hidden rounded-[var(--radius-xs)] bg-studio ring-2 ring-paper">
            <Image src={images[1].url} alt={images[1].alt} fill sizes="56px" className="object-cover" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {line.kind === "bundle" ? (
              <p className="font-display text-[15px] font-bold uppercase [font-variation-settings:'wdth'_90]">{config.bundle.label}</p>
            ) : (
              <Link href={`/produit/${first?.slug ?? ""}`} className="font-display text-[15px] font-bold uppercase [font-variation-settings:'wdth'_90] hover:underline">
                {first?.name ?? "Article indisponible"}
              </Link>
            )}
            {pl && pl.savingsCents > 0 && (
              <p className="mt-0.5 text-sm font-medium text-[#8fd9ad]">Tu économises {formatEUR(pl.savingsCents)}</p>
            )}
          </div>
          <div className="text-right">
            {pl ? (
              <>
                <p className="price text-lg">{formatEUR(pl.totalCents)}</p>
                {pl.savingsCents > 0 && (
                  <p className="text-sm text-muted line-through">{formatEUR(pl.compareAtCents * pl.quantity)}</p>
                )}
              </>
            ) : (
              <p className="text-xs text-danger">—</p>
            )}
          </div>
        </div>

        <div className="mt-3 space-y-2.5">
          {line.kind === "single" ? (
            <ItemEditor
              compact={compact}
              productId={line.productId}
              size={line.size}
              bundleOnly={false}
              onChange={(productId, size) => update(line.key, { kind: "single", productId, size, quantity: line.quantity })}
            />
          ) : (
            line.items.map((item, i) => (
              <ItemEditor
                key={i}
                compact={compact}
                label={`Veste ${i + 1}`}
                productId={item.productId}
                size={item.size}
                bundleOnly
                onChange={(productId, size) => {
                  const items = line.items.map((it, j) => (j === i ? { productId, size } : it));
                  update(line.key, { kind: "bundle", items, quantity: line.quantity });
                }}
              />
            ))
          )}
        </div>

        {error && (
          <p role="alert" className="mt-2 text-sm font-medium text-danger">
            {error}
          </p>
        )}

        <div className="mt-3 flex items-center justify-between">
          <div className="flex h-11 items-center rounded-full border border-line-strong" role="group" aria-label="Quantité">
            <button
              type="button"
              className="grid size-11 place-items-center rounded-full hover:bg-paper-3 disabled:opacity-30"
              onClick={() => setQuantity(line.key, line.quantity - 1)}
              disabled={line.quantity <= 1}
              aria-label="Diminuer la quantité"
            >
              <MinusIcon width={14} height={14} />
            </button>
            <span className="w-7 text-center text-[15px] tabular-nums" aria-live="polite">
              {line.quantity}
            </span>
            <button
              type="button"
              className="grid size-11 place-items-center rounded-full hover:bg-paper-3 disabled:opacity-30"
              onClick={() => setQuantity(line.key, line.quantity + 1)}
              disabled={line.quantity >= 10}
              aria-label="Augmenter la quantité"
            >
              <PlusIcon width={14} height={14} />
            </button>
          </div>
          <button
            type="button"
            onClick={() => remove(line.key)}
            className="-m-2 inline-flex min-h-11 items-center p-2 text-sm text-muted underline underline-offset-4 hover:text-ink"
          >
            Retirer
          </button>
        </div>
      </div>
    </article>
  );
}
