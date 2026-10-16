"use client";

import Image from "next/image";
import { formatEUR, percentOff } from "@/lib/money";
import { artClass } from "@/lib/image-fit";
import type { SizeChartRow, SizeRule } from "@/lib/sizes";
import type { PublicProduct } from "@/lib/types";
import { Gallery } from "@/components/store/Gallery";
import { SizeGuide } from "@/components/store/SizeGuide";
import { SizePicker, Swatches } from "@/components/store/ProductPurchase";
import { usePurchase, type Offer } from "./usePurchase";
import { CtaButton, DeliveryTimeline, PaymentNote, RatingLine, ReassuranceTicks, ReturnsCard, SizeGuideLink, StickyBar, StockStatus, type ConceptData } from "./blocks";

function SlotImage({ product, label }: { product: PublicProduct; label: string }) {
  const img = product.images[0];
  return (
    <div className="shot relative aspect-[4/5] overflow-hidden rounded-[14px] bg-studio">
      {img && <Image src={img.url} alt={img.alt || product.name} fill sizes="(min-width: 1024px) 28vw, 45vw" className={`object-cover ${artClass(img, "card")}`} />}
      <span className="absolute left-3 top-3 z-10 rounded-full bg-paper/85 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] backdrop-blur">{label}</span>
    </div>
  );
}

/**
 * Concept C — « Pack Studio ». Bundle-led: the page opens on a two-jacket
 * configurator with transparent price maths (2 × 19,99 → 24,95), the most
 * valuable offer for the shop. The single jacket remains one tap away.
 */
export function ConceptPack({ d, sizeRules, sizeChart, initialOffer }: { d: ConceptData; sizeRules: SizeRule[]; sizeChart: SizeChartRow[]; initialOffer: Offer }) {
  const { product } = d;
  const [p, ctaRef] = usePurchase({ product, bundleOptions: d.bundleOptions, initialOffer, initialSize: null, basePath: d.basePath });
  const bundle = p.offer === "bundle";

  const summary = (
    <div className="flex flex-col gap-5 rounded-[18px] border border-line-strong bg-paper p-5 sm:p-6 lg:sticky lg:top-24">
      <div>
        <p className="lab">{bundle ? p.bundle.label : "La veste seule"}</p>
        {bundle ? (
          <dl className="mt-4 space-y-2 text-sm">
            {p.slotProducts.map((sp, i) => (
              <div key={i} className="flex justify-between gap-3">
                <dt className="text-ink-2">Veste {i + 1} · {sp.color.name} {p.slots[i].size ?? <span className="text-muted">— taille ?</span>}</dt>
                <dd className="tabular-nums text-muted line-through">{formatEUR(sp.priceCents)}</dd>
              </div>
            ))}
            {p.savings > 0 && (
              <div className="flex justify-between gap-3 text-brand">
                <dt>Remise pack (−{percentOff(p.bundleFull, p.bundlePrice)} %)</dt>
                <dd className="tabular-nums">−{formatEUR(p.savings)}</dd>
              </div>
            )}
            <div className="flex justify-between gap-3 text-ink-2">
              <dt>Livraison</dt>
              <dd>{d.delivery.free ? "Offerte" : "Suivie"}</dd>
            </div>
          </dl>
        ) : (
          <p className="mt-3 text-sm text-ink-2">{product.name} · {p.size ?? "taille à choisir"}</p>
        )}
      </div>
      <div className="flex items-baseline justify-between border-t border-line pt-4">
        <span className="eyebrow whitespace-nowrap text-xs">Total TTC</span>
        <span className="price price-strong text-[40px] leading-none">{formatEUR(p.total)}</span>
      </div>
      <StockStatus product={product} size={p.focusSize} simulated={d.stockSimulated} />
      <div ref={ctaRef}>
        <CtaButton p={p} />
        <ReassuranceTicks d={d} className="mt-4" />
      </div>
      {p.bundleAvailable && (
        <button type="button" onClick={() => p.setOffer(bundle ? "single" : "bundle")} className="min-h-11 text-left text-sm text-muted underline underline-offset-4 hover:text-ink">
          {bundle ? `Une seule veste ? ${formatEUR(product.priceCents)}` : `Passer au pack : 2 vestes pour ${formatEUR(p.bundle.priceCents)}`}
        </button>
      )}
    </div>
  );

  return (
    <>
      <section className="container-x pb-6 pt-4 md:pt-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <RatingLine summary={d.summary} verifiedCount={d.verifiedCount} />
            <h1 className="display mt-3 text-[34px] uppercase sm:text-[52px]">{bundle ? "Compose ton pack." : product.name}</h1>
            <p className="mt-3 max-w-xl text-[15px] text-ink-2">
              {bundle ? `Deux vestes Brésil, la couleur et la taille de ton choix pour chacune : ${formatEUR(p.bundle.priceCents)} au lieu de ${formatEUR(p.bundleFull)}.` : product.tagline}
            </p>
          </div>
          <p className="text-sm text-muted lg:text-right">
            <span className="price text-lg text-ink">{formatEUR(product.priceCents)}</span> la veste
            {p.bundleAvailable && <> · <span className="price text-lg text-brand">{formatEUR(p.bundle.priceCents)}</span> les deux</>}
          </p>
        </div>
      </section>

      <section id="acheter" className="container-x scroll-mt-24 pb-16">
        <div className="grid gap-4 rounded-[22px] border border-line bg-paper-2 p-3 sm:p-5 lg:grid-cols-[1fr_380px] lg:gap-6">
          {bundle ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {p.slots.map((slot, i) => {
                const sp = p.slotProducts[i];
                return (
                  <div key={i} id={`field-slot${i}`} className="rounded-[18px] border border-line bg-paper p-3 sm:p-4">
                    <SlotImage product={sp} label={`Veste ${i + 1}`} />
                    <div className="mt-4">
                      <p className="eyebrow mb-2.5 text-xs text-muted">Couleur : <span className="text-ink">{sp.color.name}</span></p>
                      <Swatches label={`Couleur de la veste ${i + 1}`} options={d.bundleOptions} value={slot.productId} onSelect={(np) => p.selectSlotColour(i, np)} />
                    </div>
                    <div className="mt-4">
                      <div className="mb-2.5 flex items-center justify-between">
                        <p className="eyebrow text-xs text-muted">Taille : <span className="text-ink">{slot.size ?? "—"}</span></p>
                        <SizeGuideLink onClick={() => p.setGuideFor(i)} label="Ma taille" />
                      </div>
                      <SizePicker product={sp} name={`size-${i}`} value={slot.size} error={!!p.errors[`slot${i}`]} onChange={(s) => p.updateSlot(i, { size: s })} hideRemaining />
                      {p.errors[`slot${i}`] && <p role="alert" className="mt-2 text-sm font-medium text-danger">{p.errors[`slot${i}`]}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid gap-4 rounded-[18px] border border-line bg-paper p-3 sm:p-4 md:grid-cols-[1.2fr_1fr]">
              <Gallery key={product.id} images={product.images} name={product.name} />
              <div className="space-y-5 md:pt-2">
                {d.siblings.length > 1 && (
                  <div>
                    <p className="eyebrow mb-2.5 text-xs text-muted">Couleur : <span className="text-ink">{product.color.name}</span></p>
                    <Swatches variant="image" label="Couleur" options={d.siblings} value={product.id} onSelect={p.goToColour} />
                  </div>
                )}
                <div id="field-single">
                  <div className="mb-2.5 flex items-center justify-between">
                    <p className="eyebrow text-xs text-muted">Taille : <span className="text-ink">{p.size ?? "—"}</span></p>
                    <SizeGuideLink onClick={() => p.setGuideFor(-1)} />
                  </div>
                  <SizePicker product={product} name="size" value={p.size} error={!!p.errors.single} onChange={p.setSize} hideRemaining />
                  {p.errors.single && <p role="alert" className="mt-2 text-sm font-medium text-danger">{p.errors.single}</p>}
                </div>
                <p className="text-[15px] leading-relaxed text-ink-2">{product.description}</p>
              </div>
            </div>
          )}
          {summary}
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-2">
          <DeliveryTimeline delivery={d.delivery} />
          <ReturnsCard policy={d.policy} href={d.returnsHref} />
        </div>
        <PaymentNote className="mt-4" />
      </section>

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
      <StickyBar p={p} d={d} note={bundle && p.savings > 0 ? `${formatEUR(p.savings)} d'économie · livraison offerte` : undefined} />
    </>
  );
}
