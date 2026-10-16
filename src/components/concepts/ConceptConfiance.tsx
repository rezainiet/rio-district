"use client";

import clsx from "clsx";
import { formatEUR, percentOff } from "@/lib/money";
import { returnsHowTo } from "@/lib/policies";
import type { SizeChartRow, SizeRule } from "@/lib/sizes";
import { Gallery } from "@/components/store/Gallery";
import { SizeGuide } from "@/components/store/SizeGuide";
import { SizePicker, Swatches } from "@/components/store/ProductPurchase";
import { Stars } from "@/components/store/Stars";
import { usePurchase, type Offer } from "./usePurchase";
import { CtaButton, RatingLine, SizeGuideLink, StickyBar, StockStatus, reassurances, type ConceptData } from "./blocks";

/** Social proof panel shown right under the title. Honest when there is no review yet. */
function ProofPanel({ d }: { d: ConceptData }) {
  const s = d.summary;
  if (s.count === 0) {
    return (
      <div className="mt-6 rounded-[18px] border border-dashed border-line-strong p-5">
        <p className="font-semibold">Les premiers avis arrivent.</p>
        <p className="mt-1 text-sm text-muted">Chaque avis est relu avant publication. Tu as reçu ta veste ? <a href="#avis" className="text-ink underline underline-offset-4">Donne ton avis</a></p>
      </div>
    );
  }
  return (
    <div className="mt-6 grid gap-5 rounded-[18px] border border-line bg-paper-2 p-5 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-8">
      <div>
        <p className="flex items-baseline gap-1.5">
          <span className="price price-strong text-[48px] leading-none">{s.average.toLocaleString("fr-FR", { minimumFractionDigits: 1 })}</span>
          <span className="text-ink-2">/ 5</span>
        </p>
        <Stars value={s.average} size={16} className="mt-2" />
        <a href="#avis" className="mt-1.5 block text-xs text-muted underline underline-offset-4 hover:text-ink">
          {s.count} avis client{s.count > 1 ? "s" : ""}{d.verifiedCount ? ` · ${d.verifiedCount} achat${d.verifiedCount > 1 ? "s" : ""} vérifié${d.verifiedCount > 1 ? "s" : ""}` : ""}
        </a>
      </div>
      {d.topReview && (
        <figure className="border-line sm:border-l sm:pl-8">
          <blockquote className="line-clamp-3 text-[15px] leading-relaxed">« {d.topReview.text} »</blockquote>
          <figcaption className="mt-2 text-xs text-muted">
            {d.topReview.author}
            {d.topReview.color && ` · Coloris ${d.topReview.color}`}
          </figcaption>
        </figure>
      )}
    </div>
  );
}

/**
 * Concept B — « Confiance ». Trust first: social proof directly under the
 * title, then ONE elevated purchase card that holds the offer toggle,
 * selectors, stock, CTA and the guarantees, so nothing important is far
 * from the button.
 */
export function ConceptConfiance({ d, sizeRules, sizeChart, initialOffer }: { d: ConceptData; sizeRules: SizeRule[]; sizeChart: SizeChartRow[]; initialOffer: Offer }) {
  const { product } = d;
  const [p, ctaRef] = usePurchase({ product, bundleOptions: d.bundleOptions, initialOffer, initialSize: null, basePath: d.basePath });

  return (
    <section className="container-x grid gap-8 pb-16 pt-4 md:pt-6 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
      <div>
        <div className="md:mx-auto md:max-w-[560px] lg:sticky lg:top-24 lg:max-w-none">
          <Gallery key={product.id} images={product.images} name={product.name} />
        </div>
      </div>

      <div id="acheter" className="scroll-mt-24">
        <p className="lab">Veste Brésil · {product.color.name}</p>
        <h1 className="display mt-3 text-[34px] uppercase sm:text-[48px]">{product.name}</h1>
        <RatingLine summary={d.summary} verifiedCount={d.verifiedCount} className="mt-3" />
        <ProofPanel d={d} />

        {/* ---------- Purchase card ---------- */}
        <div className="relative mt-6 overflow-hidden rounded-[22px] border border-line-strong bg-paper-2 p-5 shadow-[0_40px_80px_-40px_#000] sm:p-7">
          <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/70 to-transparent" />

          {p.bundleAvailable && (
            <div role="radiogroup" aria-label="Offre" className="grid grid-cols-2 gap-1 rounded-full border border-line bg-paper p-1">
              {(["single", "bundle"] as const).map((o) => {
                const checked = p.offer === o;
                return (
                  <button
                    key={o}
                    type="button"
                    role="radio"
                    aria-checked={checked}
                    onClick={() => p.setOffer(o)}
                    className={clsx("min-h-12 rounded-full px-3 text-sm font-semibold transition-colors", checked ? "bg-ink text-paper" : "text-ink-2 hover:text-ink")}
                  >
                    {o === "single" ? `1 veste · ${formatEUR(product.priceCents)}` : `Pack de 2 · ${formatEUR(p.bundle.priceCents)}`}
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
            <p className="flex items-baseline gap-3">
              <span className="price price-strong text-[44px] leading-none">{formatEUR(p.total)}</span>
              {p.offer === "bundle" && p.savings > 0 && <s className="text-lg text-muted">{formatEUR(p.bundleFull)}</s>}
            </p>
            {p.offer === "bundle" && p.savings > 0 ? (
              <span className="rounded-full bg-lime px-3 py-1 text-xs font-bold text-[#121212]">−{percentOff(p.bundleFull, p.bundlePrice)} % · {formatEUR(p.savings)} économisés</span>
            ) : (
              <span className="text-xs text-muted">TTC · {d.delivery.free ? "livraison offerte" : "livraison suivie"}</span>
            )}
          </div>

          {p.offer === "single" ? (
            <div className="mt-6 space-y-5">
              {d.siblings.length > 1 && (
                <div>
                  <p className="eyebrow mb-3 text-xs text-muted">Couleur : <span className="text-ink">{product.color.name}</span></p>
                  <Swatches label="Couleur" options={d.siblings} value={product.id} onSelect={p.goToColour} />
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
            <div className="mt-6 divide-y divide-line">
              {p.slots.map((slot, i) => {
                const sp = p.slotProducts[i];
                return (
                  <div key={i} id={`field-slot${i}`} className="py-4 first:pt-0">
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

          <StockStatus product={product} size={p.focusSize} simulated={d.stockSimulated} className="mt-6" />

          <div ref={ctaRef} className="mt-4">
            <CtaButton p={p} />
          </div>

          <ul className="mt-6 divide-y divide-line border-t border-line">
            {reassurances(d).map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex items-start gap-3 py-3.5">
                <Icon width={20} height={20} className="mt-0.5 shrink-0 text-brand" />
                <span>
                  <span className="block text-sm font-semibold">{title}</span>
                  <span className="block text-xs text-muted">{text}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            {returnsHowTo(d.policy)}{" "}
            <a href={d.returnsHref} className="text-ink underline underline-offset-4">Retours & remboursements</a>
          </p>
        </div>

        <div className="mt-8">
          <p className="eyebrow text-xs text-muted">La veste</p>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-2">{product.description}</p>
          {product.details.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2">
              {product.details.map((x) => <li key={x} className="rounded-full border border-line px-3.5 py-2 text-[13px] text-ink-2">{x}</li>)}
            </ul>
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
      <StickyBar p={p} d={d} note={`Retour ${d.policy.windowDays} jours${d.delivery.free ? " · livraison offerte" : ""}`} />
    </section>
  );
}
