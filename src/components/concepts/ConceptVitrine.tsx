"use client";

import Image from "next/image";
import clsx from "clsx";
import { formatEUR, percentOff } from "@/lib/money";
import { artClass } from "@/lib/image-fit";
import type { SizeChartRow, SizeRule } from "@/lib/sizes";
import { Gallery } from "@/components/store/Gallery";
import { SizeGuide } from "@/components/store/SizeGuide";
import { SizePicker, Swatches } from "@/components/store/ProductPurchase";
import { usePurchase, type Offer } from "./usePurchase";
import {
  CtaButton,
  DeliveryTimeline,
  PaymentNote,
  RatingLine,
  ReassuranceTicks,
  ReturnsCard,
  SizeGuideLink,
  StickyBar,
  StockStatus,
  type ConceptData,
} from "./blocks";

/**
 * Concept A — « Vitrine ». The current split layout, rebuilt around trust:
 * rating under the title, honest stock line, offer cards, then the whole
 * reassurance stack (ticks, delivery timeline, returns) right under the CTA.
 */
export function ConceptVitrine({ d, sizeRules, sizeChart, initialOffer }: { d: ConceptData; sizeRules: SizeRule[]; sizeChart: SizeChartRow[]; initialOffer: Offer }) {
  const { product } = d;
  const [p, ctaRef] = usePurchase({ product, bundleOptions: d.bundleOptions, initialOffer, initialSize: null, basePath: d.basePath });

  return (
    <section className="container-x grid gap-8 pb-16 pt-4 md:gap-10 md:pt-6 lg:grid-cols-12 lg:gap-16">
      <div className="lg:col-span-7">
        <div className="md:mx-auto md:max-w-[560px] lg:sticky lg:top-24 lg:max-w-none">
          <Gallery key={product.id} images={product.images} name={product.name} />
        </div>
      </div>

      <div id="acheter" className="scroll-mt-24 lg:col-span-5">
        <RatingLine summary={d.summary} verifiedCount={d.verifiedCount} />
        <h1 className="display mt-4 text-[34px] uppercase sm:text-[44px]">{product.name}</h1>
        {product.tagline && <p className="mt-3 text-[15px] text-ink-2">{product.tagline}</p>}

        <div className="mt-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-3 border-y border-line py-5">
          <div>
            <p className="flex items-baseline gap-3">
              <span className="price price-strong text-[40px] leading-none">{formatEUR(p.total)}</span>
              {p.offer === "bundle" && p.savings > 0 && <s className="text-lg text-muted">{formatEUR(p.bundleFull)}</s>}
            </p>
            <p className="mt-2 text-xs text-muted">TTC · {d.delivery.free ? "livraison offerte" : "livraison suivie"}</p>
          </div>
          {p.bundleAvailable && p.offer === "single" && (
            <button type="button" onClick={() => p.setOffer("bundle")} className="min-h-11 text-left text-sm text-ink-2 hover:text-ink sm:text-right">
              ou <span className="font-semibold text-brand">2 pour {formatEUR(p.bundle.priceCents)}</span>
              <span className="block text-xs text-muted underline underline-offset-4">Composer un pack</span>
            </button>
          )}
        </div>

        <StockStatus product={product} size={p.focusSize} simulated={d.stockSimulated} className="mt-5" />

        {p.bundleAvailable && (
          <fieldset className="mt-7">
            <legend className="eyebrow mb-3 text-xs text-muted">Choisis ton offre</legend>
            <div className="grid gap-2.5">
              {(["single", "bundle"] as const).map((o) => {
                const checked = p.offer === o;
                const thumbs = o === "single" ? [product] : p.slotProducts;
                return (
                  <label
                    key={o}
                    className={clsx(
                      "flex min-h-[76px] cursor-pointer items-center gap-4 rounded-[18px] border px-4 py-3 transition-colors",
                      checked ? "border-ink bg-paper-2" : "border-line-strong hover:border-ink",
                    )}
                  >
                    <input type="radio" name="offer" checked={checked} onChange={() => p.setOffer(o)} className="size-5 shrink-0 accent-[var(--color-ink)]" />
                    <span className="flex shrink-0 -space-x-5" aria-hidden>
                      {thumbs.map((t, j) => (
                        <span key={t.id + j} className="relative h-14 w-11 overflow-hidden rounded-lg bg-studio ring-2 ring-paper-2">
                          {t.images[0] && <Image src={t.images[0].url} alt="" fill sizes="44px" className={`object-cover ${artClass(t.images[0], "thumb")}`} />}
                        </span>
                      ))}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-display text-[15px] font-bold uppercase">{o === "single" ? "La veste seule" : p.bundle.label}</span>
                      <span className="block text-xs text-muted">{o === "single" ? product.color.name : "2 coloris et 2 tailles au choix"}</span>
                      {o === "bundle" && p.savings > 0 && <span className="mt-1 block text-xs font-semibold text-brand">{formatEUR(p.savings)} d&apos;économie</span>}
                    </span>
                    <span className="shrink-0 text-right">
                      {o === "bundle" && p.savings > 0 && (
                        <span className="mb-1 inline-block rounded-full bg-lime px-2 py-0.5 text-[11px] font-bold text-[#121212]">−{percentOff(p.bundleFull, p.bundlePrice)} %</span>
                      )}
                      <span className="price block text-xl">{formatEUR(o === "single" ? product.priceCents : p.bundlePrice)}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}

        {p.offer === "single" ? (
          <div className="mt-7 space-y-6">
            {d.siblings.length > 1 && (
              <div>
                <p className="eyebrow mb-3 text-xs text-muted">Couleur : <span className="text-ink">{product.color.name}</span></p>
                <Swatches variant="image" label="Couleur" options={d.siblings} value={product.id} onSelect={p.goToColour} />
              </div>
            )}
            <div id="field-single">
              <div className="mb-3 flex items-center justify-between">
                <p className="eyebrow text-xs text-muted">Taille : <span className="text-ink">{p.size ?? "—"}</span></p>
                <SizeGuideLink onClick={() => p.setGuideFor(-1)} />
              </div>
              <SizePicker product={product} name="size" value={p.size} error={!!p.errors.single} onChange={p.setSize} hideRemaining />
              {p.errors.single && <p role="alert" className="mt-2 text-sm font-medium text-danger">{p.errors.single}</p>}
            </div>
          </div>
        ) : (
          <div className="mt-7 space-y-3">
            {p.slots.map((slot, i) => {
              const sp = p.slotProducts[i];
              return (
                <div key={i} id={`field-slot${i}`} className="rounded-[18px] border border-line bg-paper-2 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="eyebrow text-xs text-muted">Veste {i + 1} · <span className="text-ink">{sp.color.name} {slot.size ?? ""}</span></p>
                    <SizeGuideLink onClick={() => p.setGuideFor(i)} label="Ma taille" />
                  </div>
                  <Swatches label={`Couleur de la veste ${i + 1}`} options={d.bundleOptions} value={slot.productId} onSelect={(np) => p.selectSlotColour(i, np)} />
                  <div className="mt-3">
                    <SizePicker product={sp} name={`size-${i}`} value={slot.size} error={!!p.errors[`slot${i}`]} onChange={(s) => p.updateSlot(i, { size: s })} hideRemaining />
                  </div>
                  {p.errors[`slot${i}`] && <p role="alert" className="mt-2 text-sm font-medium text-danger">{p.errors[`slot${i}`]}</p>}
                </div>
              );
            })}
          </div>
        )}

        <div ref={ctaRef} className="mt-7">
          <CtaButton p={p} />
          <ReassuranceTicks d={d} className="mt-4 justify-center" />
        </div>

        <div className="mt-7 grid gap-3">
          <DeliveryTimeline delivery={d.delivery} />
          <ReturnsCard policy={d.policy} href={d.returnsHref} />
        </div>
        <PaymentNote className="mt-4" />

        <div className="faq mt-8 divide-y divide-line border-y border-line">
          <details open className="group">
            <summary className="flex min-h-14 list-none items-center justify-between py-4">
              <span className="eyebrow text-xs">Description</span>
              <span className="faq-icon text-xl text-brand transition-transform" aria-hidden>+</span>
            </summary>
            <p className="pb-5 text-[15px] leading-relaxed text-ink-2">{product.description}</p>
          </details>
          {product.details.length > 0 && (
            <details className="group">
              <summary className="flex min-h-14 list-none items-center justify-between py-4">
                <span className="eyebrow text-xs">Détails</span>
                <span className="faq-icon text-xl text-brand transition-transform" aria-hidden>+</span>
              </summary>
              <ul className="list-disc space-y-1 pb-5 pl-5 text-[15px] text-ink-2">
                {product.details.map((x) => <li key={x}>{x}</li>)}
              </ul>
            </details>
          )}
        </div>
      </div>

      <SizeGuide
        open={p.guideFor !== null}
        onClose={() => p.setGuideFor(null)}
        rules={sizeRules}
        chart={sizeChart}
        onPick={(s) => {
          if (p.guideFor === -1 || p.guideFor === null) {
            if (product.sizes.some((x) => x.label === s && x.available)) p.setSize(s);
          } else if (p.slotProducts[p.guideFor]?.sizes.some((x) => x.label === s && x.available)) p.updateSlot(p.guideFor, { size: s });
        }}
      />
      <StickyBar p={p} d={d} />
    </section>
  );
}
