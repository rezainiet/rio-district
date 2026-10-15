"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { useStore } from "./StoreProvider";
import { SizeGuide } from "./SizeGuide";
import { formatEUR, percentOff } from "@/lib/money";
import { artClass } from "@/lib/image-fit";
import type { Size, SizeChartRow, SizeRule } from "@/lib/sizes";
import type { PublicProduct } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { CheckIcon, InfoIcon, ReturnIcon, RulerIcon, TruckIcon } from "@/components/ui/icons";

type Offer = "single" | "bundle";
type Slot = { productId: string; size: Size | null };

function SizePicker({
  product,
  value,
  onChange,
  name,
  error,
}: {
  product: PublicProduct;
  value: Size | null;
  onChange: (s: Size) => void;
  name: string;
  error?: boolean;
}) {
  const selected = product.sizes.find((s) => s.label === value);
  return (
    <div>
      <div
        role="radiogroup"
        aria-label={`Taille — ${product.name}`}
        aria-invalid={error || undefined}
        className="grid grid-cols-7 gap-1.5"
      >
        {product.sizes.map((s) => {
          const checked = value === s.label;
          return (
            <label
              key={s.label}
              className={clsx(
                "relative grid h-12 place-items-center rounded-[var(--radius-sm)] border text-[13px] font-semibold transition-colors",
                !s.available && "cursor-not-allowed border-dashed border-line text-muted/60 line-through",
                s.available && !checked && "border-line-strong bg-[#fbf9f4] hover:border-ink",
                checked && "border-ink bg-ink text-paper",
                error && !checked && s.available && "border-danger/60",
              )}
            >
              <input
                type="radio"
                name={name}
                value={s.label}
                checked={checked}
                disabled={!s.available}
                onChange={() => onChange(s.label)}
                className="peer sr-only"
              />
              <span className="peer-focus-visible:underline">{s.label}</span>
              {!s.available && <span className="sr-only"> (épuisé)</span>}
            </label>
          );
        })}
      </div>
      {selected?.remaining != null && (
        <p className="mt-2 text-xs font-medium text-warning">
          Plus que {selected.remaining} en {selected.label}.
        </p>
      )}
    </div>
  );
}

function Swatches({
  options,
  value,
  onSelect,
  label,
  variant = "dot",
}: {
  options: PublicProduct[];
  value: string;
  onSelect: (p: PublicProduct) => void;
  label: string;
  variant?: "dot" | "image";
}) {
  if (variant === "image") {
    return (
      <div role="radiogroup" aria-label={label} className="grid max-w-[400px] grid-cols-6 gap-1.5 sm:gap-2">
        {options.map((p) => {
          const checked = p.id === value;
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-label={p.color.name || p.name}
              title={p.color.name}
              onClick={() => onSelect(p)}
              className={clsx(
                "group relative aspect-[4/5] overflow-hidden rounded-[var(--radius-sm)] bg-studio transition",
                checked ? "ring-2 ring-ink ring-offset-2 ring-offset-paper" : "ring-1 ring-line hover:ring-ink/60",
              )}
            >
              {p.images[0] && <Image src={p.images[0].url} alt="" fill sizes="64px" className={`object-cover ${artClass(p.images[0], "thumb")}`} />}
              <span className="absolute bottom-1 left-1/2 size-2 -translate-x-1/2 rounded-full ring-1 ring-black/20" style={{ background: p.color.hex }} aria-hidden />
            </button>
          );
        })}
      </div>
    );
  }
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2.5">
      {options.map((p) => {
        const checked = p.id === value;
        return (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={p.color.name || p.name}
            title={p.color.name}
            onClick={() => onSelect(p)}
            className={clsx(
              "relative size-10 rounded-full ring-offset-2 ring-offset-paper transition",
              checked ? "ring-2 ring-ink" : "ring-1 ring-black/15 hover:ring-ink/60",
            )}
            style={{ background: p.color.hex }}
          >
            {checked && (
              <CheckIcon
                width={16}
                height={16}
                className={clsx("absolute inset-0 m-auto", isLight(p.color.hex) ? "text-ink" : "text-white")}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

function isLight(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 160;
}

export function ProductPurchase({
  product,
  siblings,
  bundleOptions,
  initialOffer,
  initialSize,
  sizeRules,
  sizeChart,
  delivery,
}: {
  product: PublicProduct;
  siblings: PublicProduct[];
  bundleOptions: PublicProduct[];
  initialOffer: Offer;
  initialSize: Size | null;
  sizeRules: SizeRule[];
  sizeChart: SizeChartRow[];
  delivery: { label: string; range: string; summary: string; returns: string };
}) {
  const router = useRouter();
  const { add, config, setDrawerOpen } = useStore();
  const bundle = config.bundle;
  const bundleAvailable = bundle.enabled && product.bundleEligible && bundleOptions.length > 0;

  const [offer, setOffer] = useState<Offer>(bundleAvailable ? initialOffer : "single");
  const [size, setSize] = useState<Size | null>(initialSize);
  const secondDefault = bundleOptions.find((p) => p.id !== product.id) ?? product;
  const [slots, setSlots] = useState<Slot[]>([
    { productId: product.id, size: initialSize },
    { productId: secondDefault.id, size: null },
  ]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [guideFor, setGuideFor] = useState<number | null>(null);
  const [added, setAdded] = useState(false);
  const ctaRef = useRef<HTMLDivElement>(null);
  const [ctaVisible, setCtaVisible] = useState(true);
  const [footerVisible, setFooterVisible] = useState(false);

  const optionMap = useMemo(() => new Map(bundleOptions.map((p) => [p.id, p])), [bundleOptions]);

  // Keep offer & size in the URL so they survive colour navigation and reloads.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (offer === "bundle") url.searchParams.set("offre", "pack");
    else url.searchParams.delete("offre");
    if (size) url.searchParams.set("taille", size);
    else url.searchParams.delete("taille");
    window.history.replaceState(window.history.state, "", url);
  }, [offer, size]);

  // Sticky mobile bar appears once the main CTA scrolls out of view.
  useEffect(() => {
    const el = ctaRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setCtaVisible(entry.isIntersecting || entry.boundingClientRect.top > 0), {
      threshold: 0,
    });
    io.observe(el);
    // Hide the bar over the footer so it never covers footer content.
    const footer = document.querySelector("footer");
    const fo = new IntersectionObserver(([entry]) => setFooterVisible(entry.isIntersecting));
    if (footer) fo.observe(footer);
    return () => {
      io.disconnect();
      fo.disconnect();
    };
  }, []);

  const barHidden = ctaVisible || footerVisible;

  const singleTotal = product.priceCents;
  const slotProducts = slots.map((s) => optionMap.get(s.productId) ?? product);
  const bundleFull = slotProducts.reduce((sum, p) => sum + p.priceCents, 0);
  const bundlePrice = Math.min(bundle.priceCents, bundleFull);
  const total = offer === "bundle" ? bundlePrice : singleTotal;

  const colourHref = (p: PublicProduct) => {
    const params = new URLSearchParams();
    if (offer === "bundle") params.set("offre", "pack");
    if (size && p.sizes.some((s) => s.label === size && s.available)) params.set("taille", size);
    const q = params.toString();
    return `/produit/${p.slug}${q ? `?${q}` : ""}#acheter`;
  };

  const updateSlot = (i: number, patch: Partial<Slot>) => {
    setSlots((prev) => prev.map((s, j) => (j === i ? { ...s, ...patch } : s)));
    setErrors((e) => ({ ...e, [`slot${i}`]: "" }));
    setAdded(false);
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (offer === "single" && !size) next.single = "Choisis ta taille.";
    if (offer === "bundle") {
      slots.forEach((s, i) => {
        if (!s.size) next[`slot${i}`] = `Choisis la taille de la veste ${i + 1}.`;
      });
    }
    setErrors(next);
    const firstKey = Object.keys(next)[0];
    if (firstKey) {
      document.getElementById(`field-${firstKey}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return false;
    }
    return true;
  };

  const addToCart = () => {
    if (!config.acceptingOrders) return;
    if (!validate()) return;
    if (offer === "single") {
      add({ kind: "single", productId: product.id, size: size!, quantity: 1 });
    } else {
      add({ kind: "bundle", items: slots.map((s) => ({ productId: s.productId, size: s.size! })), quantity: 1 });
    }
    setAdded(true);
    setDrawerOpen(true);
  };

  const ctaLabel = !config.acceptingOrders
    ? "Commandes bientôt ouvertes"
    : offer === "bundle"
      ? `Ajouter le pack · ${formatEUR(total)}`
      : `Ajouter au panier · ${formatEUR(total)}`;

  return (
    <div id="acheter" className="scroll-mt-24">
      <p className="eyebrow text-muted">{product.group ? "Veste Brésil" : "KALT"} · {product.color.name}</p>
      <h1 className="display mt-2 text-[48px] sm:text-[56px] lg:text-[64px]">{product.name}</h1>
      {product.tagline && <p className="mt-3 text-[15px] text-ink-2">{product.tagline}</p>}

      <div className="mt-5 flex items-baseline gap-3">
        <p className="price text-4xl">{formatEUR(total)}</p>
        {offer === "bundle" && bundleFull > bundlePrice && (
          <>
            <p className="text-lg text-muted line-through">{formatEUR(bundleFull)}</p>
          </>
        )}
        {offer === "single" && product.compareAtCents && product.compareAtCents > product.priceCents && (
          <p className="text-lg text-muted line-through">{formatEUR(product.compareAtCents)}</p>
        )}
      </div>
      <p className="mt-1 text-xs text-muted">
        TTC · {config.shippingCents === 0 ? "Livraison offerte" : `Livraison ${formatEUR(config.shippingCents)}`}
      </p>

      {/* ---------- Offer ---------- */}
      {bundleAvailable && (
        <fieldset className="mt-8">
          <legend className="eyebrow mb-3 text-muted">Choisis ton offre</legend>
          <div className="grid gap-2.5">
            {(
              [
                {
                  value: "single" as const,
                  title: "La veste seule",
                  sub: product.color.name,
                  price: formatEUR(product.priceCents),
                  extra: null,
                  thumbs: [product],
                },
                {
                  value: "bundle" as const,
                  title: bundle.label,
                  sub: "2 coloris, 2 tailles au choix",
                  price: formatEUR(bundlePrice),
                  extra: bundleFull > bundlePrice ? `${formatEUR(bundleFull - bundlePrice)} d'économie` : null,
                  thumbs: slotProducts,
                },
              ] as const
            ).map((o) => {
              const checked = offer === o.value;
              return (
                <label
                  key={o.value}
                  className={clsx(
                    "flex min-h-[72px] items-center gap-4 rounded-[var(--radius-md)] border px-4 py-3 transition-colors",
                    checked ? "border-ink bg-[#fbf9f4] shadow-[inset_0_0_0_1px_var(--color-ink)]" : "border-line-strong hover:border-ink",
                  )}
                >
                  <input
                    type="radio"
                    name="offer"
                    value={o.value}
                    checked={checked}
                    onChange={() => {
                      setOffer(o.value);
                      setErrors({});
                      setAdded(false);
                      if (o.value === "bundle") updateSlot(0, { size: slots[0].size ?? size });
                      else if (!size && slots[0].productId === product.id) setSize(slots[0].size);
                    }}
                    className="size-5 shrink-0 accent-[var(--color-ink)]"
                  />
                  <span className="flex shrink-0 -space-x-5" aria-hidden>
                    {o.thumbs.map((t, j) => (
                      <span key={t.id + j} className="relative h-14 w-11 overflow-hidden rounded-[var(--radius-xs)] bg-studio ring-2 ring-[#fbf9f4]">
                        {t.images[0] && <Image src={t.images[0].url} alt="" fill sizes="44px" className={`object-cover ${artClass(t.images[0], "thumb")}`} />}
                      </span>
                    ))}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2 font-display text-[15px] font-bold uppercase [font-variation-settings:'wdth'_90]">
                      {o.title}
                    </span>
                    <span className="block text-xs text-muted">{o.sub}</span>
                    {o.extra && <span className="mt-1 block text-xs font-semibold text-brand">{o.extra}</span>}
                  </span>
                  <span className="shrink-0 text-right">
                    {o.value === "bundle" && bundleFull > bundlePrice && (
                      <span className="eyebrow mb-1 inline-block rounded-full bg-lime px-2 py-0.5 text-[9.5px]">−{percentOff(bundleFull, bundlePrice)} %</span>
                    )}
                    <span className="price block text-xl">{o.price}</span>
                    {o.value === "bundle" && bundleFull > bundlePrice && (
                      <span className="block text-xs text-muted line-through">{formatEUR(bundleFull)}</span>
                    )}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      {/* ---------- Selection ---------- */}
      {offer === "single" ? (
        <div className="mt-8 space-y-7">
          {siblings.length > 1 && (
            <div>
              <p className="eyebrow mb-3 text-muted">
                Couleur : <span className="text-ink">{product.color.name}</span>
              </p>
              <Swatches
                variant="image"
                label="Couleur"
                options={siblings}
                value={product.id}
                onSelect={(p) => {
                  if (p.id !== product.id) router.push(colourHref(p), { scroll: false });
                }}
              />
            </div>
          )}
          <div id="field-single">
            <div className="mb-3 flex items-center justify-between">
              <p className="eyebrow text-muted">
                Taille : <span className="text-ink">{size ?? "—"}</span>
              </p>
              <button type="button" onClick={() => setGuideFor(-1)} className="flex items-center gap-1.5 text-xs font-medium underline underline-offset-4">
                <RulerIcon width={16} height={16} /> Trouver ma taille
              </button>
            </div>
            <SizePicker
              product={product}
              name="size"
              value={size}
              error={!!errors.single}
              onChange={(s) => {
                setSize(s);
                setErrors({});
                setAdded(false);
              }}
            />
            {errors.single && <p role="alert" className="mt-2 text-sm font-medium text-danger">{errors.single}</p>}
          </div>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {slots.map((slot, i) => {
            const p = slotProducts[i];
            return (
              <div key={i} id={`field-slot${i}`} className="rounded-[var(--radius-md)] border border-line bg-[#fbf9f4] p-4">
                <div className="flex items-center gap-3">
                  <div className="relative h-14 w-11 shrink-0 overflow-hidden rounded-[var(--radius-xs)] bg-studio">
                    {p.images[0] && <Image src={p.images[0].url} alt="" fill sizes="44px" className={`object-cover ${artClass(p.images[0], "thumb")}`} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="eyebrow text-muted">Veste {i + 1}</p>
                    <p className="font-display text-[15px] font-bold uppercase [font-variation-settings:'wdth'_90]">
                      {p.color.name} · {slot.size ?? "taille ?"}
                    </p>
                  </div>
                  <button type="button" onClick={() => setGuideFor(i)} className="text-xs font-medium underline underline-offset-4">
                    Ma taille
                  </button>
                </div>
                <div className="mt-4">
                  <Swatches
                    label={`Couleur de la veste ${i + 1}`}
                    options={bundleOptions}
                    value={slot.productId}
                    onSelect={(np) => {
                      const keep = slot.size && np.sizes.some((s) => s.label === slot.size && s.available);
                      updateSlot(i, { productId: np.id, size: keep ? slot.size : null });
                    }}
                  />
                </div>
                <div className="mt-4">
                  <SizePicker
                    product={p}
                    name={`size-${i}`}
                    value={slot.size}
                    error={!!errors[`slot${i}`]}
                    onChange={(s) => updateSlot(i, { size: s })}
                  />
                </div>
                {errors[`slot${i}`] && (
                  <p role="alert" className="mt-2 text-sm font-medium text-danger">{errors[`slot${i}`]}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ---------- CTA ---------- */}
      <div ref={ctaRef} className="mt-8">
        <Button size="lg" className="w-full" onClick={addToCart} disabled={!config.acceptingOrders}>
          {added ? (
            <>
              <CheckIcon width={18} height={18} /> Ajouté au panier
            </>
          ) : (
            ctaLabel
          )}
        </Button>
        {!config.acceptingOrders && <p className="mt-2 text-sm text-muted">{config.closedMessage}</p>}
        <p className="mt-3 flex gap-2 text-xs leading-relaxed text-muted">
          <InfoIcon width={16} height={16} className="mt-px shrink-0" />
          Paiement en ligne bientôt disponible : tu envoies une demande de commande, nous la confirmons par e-mail. Rien
          n&apos;est débité aujourd&apos;hui.
        </p>
      </div>

      <ol className="mt-8 grid grid-cols-3 border-y border-line py-5 text-center" aria-label="Étapes de la commande">
        {[
          { title: "Aujourd'hui", sub: "Ta demande" },
          { title: "Par e-mail", sub: "Confirmation et paiement" },
          { title: delivery.range, sub: "Livraison estimée" },
        ].map((step, i) => (
          <li
            key={step.sub}
            className="relative px-1 before:absolute before:left-[-50%] before:top-[11px] before:h-px before:w-full before:bg-line-strong first:before:hidden"
          >
            <span className="relative z-10 mx-auto grid size-[22px] place-items-center rounded-full bg-ink text-[10px] font-bold text-paper">
              {i + 1}
            </span>
            <span className="mt-2 block text-[13px] font-semibold">{step.title}</span>
            <span className="block text-[11px] leading-snug text-muted">{step.sub}</span>
          </li>
        ))}
      </ol>
      <ul className="mt-4 space-y-2 text-[13px] text-ink-2">
        <li className="flex items-center gap-2.5">
          <TruckIcon width={18} height={18} className="shrink-0 text-brand" />
          {delivery.summary}
        </li>
        <li className="flex items-center gap-2.5">
          <ReturnIcon width={18} height={18} className="shrink-0 text-brand" />
          {delivery.returns}
        </li>
      </ul>
      <Link href="/livraison-retours" className="mt-3 inline-block text-xs text-muted underline underline-offset-4 hover:text-ink">
        Conditions de livraison et de retour
      </Link>

      <SizeGuide
        open={guideFor !== null}
        onClose={() => setGuideFor(null)}
        rules={sizeRules}
        chart={sizeChart}
        onPick={(s) => {
          if (guideFor === -1 || guideFor === null) {
            if (product.sizes.some((x) => x.label === s && x.available)) setSize(s);
          } else if (slotProducts[guideFor]?.sizes.some((x) => x.label === s && x.available)) {
            updateSlot(guideFor, { size: s });
          }
        }}
      />

      {/* ---------- Sticky mobile bar ---------- */}
      <div
        className={clsx(
          "fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md transition-transform duration-300 md:hidden",
          barHidden ? "translate-y-full" : "translate-y-0",
        )}
        aria-hidden={barHidden}
      >
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-muted">
              {offer === "bundle"
                ? `${slotProducts.map((p, i) => `${p.color.name} ${slots[i].size ?? "?"}`).join(" + ")}`
                : `${product.name}${size ? ` · ${size}` : ""}`}
            </p>
            <p className="price text-xl">{formatEUR(total)}</p>
          </div>
          <Button
            tabIndex={barHidden ? -1 : 0}
            onClick={() => {
              if (validate()) addToCart();
            }}
            disabled={!config.acceptingOrders}
          >
            {offer === "bundle" ? "Ajouter le pack" : "Ajouter"}
          </Button>
        </div>
      </div>
    </div>
  );
}
