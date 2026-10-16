"use client";

/* CONCEPT 03 — MOBILE CONVERSION PRO
   Built for a visitor arriving from a social ad on a phone: understand, choose, order — in as few
   gestures as possible. Desktop keeps the buy box in view (sticky) while the page scrolls. */
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { artClass } from "@/lib/image-fit";
import { formatEUR } from "@/lib/money";
import { CheckIcon } from "@/components/ui/icons";
import {
  CountdownRow,
  CtaButton,
  DeliveryTimeline,
  DetailsAccordion,
  FaqList,
  OfferSelector,
  PaymentNote,
  RatingLink,
  RatingPanel,
  RelatedColours,
  ReviewCarousel,
  ReviewGrid,
  ReviewSourceNote,
  Selection,
  StickyBar,
  StockLine,
  SupportCard,
  TrustCards,
  VideoSlot,
  deliveryWords,
} from "./blocks";
import type { Size } from "@/lib/sizes";
import type { PreviewData } from "./types";
import { usePurchase, type Offer } from "./usePurchase";

function Hero({ d }: { d: PreviewData }) {
  const img = d.product.images[0];
  return (
    <div>
      <div className="shot relative -mx-4 aspect-[10/9] overflow-hidden bg-studio sm:-mx-6 md:mx-0 md:aspect-[4/5] md:rounded-[22px]">
        {img && <Image src={img.url} alt={img.alt || d.product.name} fill priority sizes="(min-width: 1024px) 55vw, 100vw" className={`object-cover ${artClass(img, "hero")}`} />}
        {d.summary.count > 0 && (
          <a href="#avis" className="absolute bottom-3 left-3 inline-flex min-h-9 items-center gap-1.5 rounded-full bg-black/60 px-3 text-[13px] font-semibold text-white backdrop-blur">
            <span className="text-brand" aria-hidden>★</span>
            {d.summary.average.toLocaleString("fr-FR", { minimumFractionDigits: 1 })} · {d.summary.count} avis
          </a>
        )}
        {d.freeShipping && (
          <span className="absolute right-3 top-3 rounded-full bg-black/60 px-3 py-1.5 text-[12px] font-semibold text-white backdrop-blur">Livraison offerte</span>
        )}
      </div>
    </div>
  );
}

export function Concept03({ d, basePath, initialOffer, initialSize }: { d: PreviewData; basePath: string; initialOffer: Offer; initialSize: Size | null }) {
  const [p, zoneRef] = usePurchase({ product: d.product, bundleOptions: d.bundleOptions, initialOffer, initialSize, basePath });
  const [allReviews, setAllReviews] = useState(false);
  const stock = d.stock[d.product.id];
  const w = deliveryWords(d.plan);

  return (
    <>
      {/* Sticky campaign row under the header (only when a campaign is live). */}
      {d.countdown && <CountdownRow data={d.countdown} sample={d.countdown.sample} variant="bar" className="sticky top-16 z-30 md:top-20" />}

      <section className="container-x grid gap-6 pb-14 pt-0 md:pt-6 lg:grid-cols-12 lg:gap-x-12 lg:gap-y-14 lg:pb-20 lg:pt-8">
        <div className="min-w-0 lg:col-span-7">
          <div className="mx-auto md:max-w-[520px] lg:max-w-none">
            <Hero d={d} />
          </div>
        </div>

        {/* Buy box: right after the photo on mobile, sticky in its column on desktop. */}
        <div className="min-w-0 lg:col-span-5 lg:row-span-2">
          <div className="lg:sticky lg:top-28 lg:max-h-[calc(100dvh-8rem)] lg:overflow-y-auto lg:overscroll-contain lg:pr-2 lg:[scrollbar-width:thin]">
            <div className="flex items-start justify-between gap-4">
              <h1 className="display text-[26px] uppercase leading-[0.95] sm:text-[32px]">{d.product.name}</h1>
              <p className="shrink-0 text-right">
                <span className="price block text-[28px] leading-none">{formatEUR(p.total)}</span>
                {p.offer === "bundle" && p.savings > 0 && <span className="block text-xs text-muted line-through">{formatEUR(p.bundleFull)}</span>}
              </p>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-4">
              <RatingLink summary={d.summary} compact />
              <StockLine info={stock} size={p.offer === "single" ? p.size : null} />
            </div>

            <div ref={zoneRef} id="acheter" className="scroll-mt-32 pt-4">
              <OfferSelector p={p} d={d} variant="segmented" />
              <div className="mt-5">
                <Selection p={p} d={d} compact />
              </div>
              <CtaButton p={p} className="mt-5" />
              <ul className="mt-3 grid grid-cols-3 gap-2 text-center text-[12px] leading-tight text-ink-2">
                {[`Livrée ${w.short}`, `Retour ${d.policy.windowDays} jours`, d.payments.online ? "Paiement en ligne" : "Rien à payer aujourd'hui"].map((t) => (
                  <li key={t} className="flex flex-col items-center gap-1 rounded-xl border border-line px-1.5 py-2">
                    <CheckIcon width={14} height={14} className="text-brand" />
                    {t}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[13px] text-ink-2">
                Retour possible sous {d.policy.windowDays} jours après réception.{" "}
                <Link href={d.returnsHref} className="text-muted underline underline-offset-4 hover:text-ink">Conditions</Link>
              </p>
              <PaymentNote d={d} className="mt-1.5" />
            </div>
            <DeliveryTimeline plan={d.plan} variant="compact" className="mt-5 lg:hidden" />
          </div>
        </div>

        {/* Everything else, under the photo on desktop. */}
        <div className="min-w-0 space-y-12 lg:col-span-7">
          <DeliveryTimeline plan={d.plan} className="hidden lg:block" />

          <section id="avis" aria-labelledby="avis-title" className="scroll-mt-32">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <p className="lab">Avis clients</p>
                  <ReviewSourceNote d={d} />
                </div>
                <h2 id="avis-title" className="display mt-2 text-[26px] uppercase sm:text-[36px]">Ils l&apos;ont adoptée.</h2>
              </div>
              {d.summary.count > 0 && <RatingLink summary={d.summary} />}
            </div>
            {allReviews ? (
              <>
                <RatingPanel summary={d.summary} className="mt-5" />
                <ReviewGrid d={d} className="mt-5" />
              </>
            ) : (
              <ReviewCarousel d={d} className="mt-5" onSeeAll={() => setAllReviews(true)} />
            )}
          </section>

          <section aria-labelledby="garanties-title">
            <p className="lab">Commander sereinement</p>
            <h2 id="garanties-title" className="display mt-2 text-[26px] uppercase sm:text-[36px]">Livraison, paiement, retours.</h2>
            <TrustCards d={d} variant="rows" className="mt-5" />
          </section>

          <DetailsAccordion product={d.product} />

          <VideoSlot />

          <section aria-labelledby="faq-title">
            <p className="lab">FAQ</p>
            <h2 id="faq-title" className="display mt-2 text-[26px] uppercase sm:text-[36px]">Questions fréquentes.</h2>
            <FaqList d={d} className="mt-5" />
            <SupportCard d={d} className="mt-6" />
          </section>

          <section aria-labelledby="related-title">
            <p className="lab">Les autres coloris</p>
            <h2 id="related-title" className="display mt-2 text-[26px] uppercase sm:text-[36px]">Complète ton pack.</h2>
            <RelatedColours d={d} basePath={basePath} className="mt-5 sm:grid-cols-3 xl:grid-cols-5" />
          </section>
        </div>
      </section>

      <StickyBar p={p} d={d} />
    </>
  );
}
