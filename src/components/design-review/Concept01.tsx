"use client";

/* CONCEPT 01 — TRUST-FIRST COMMERCE
   KALT's information order, made clearer: everything that reassures sits ABOVE the button. */
import Image from "next/image";
import { formatEUR } from "@/lib/money";
import { Gallery } from "@/components/store/Gallery";
import {
  CountdownRow,
  CtaButton,
  DeliveryEstimate,
  DeliveryTimeline,
  DetailsAccordion,
  FaqList,
  OfferSelector,
  PaymentNote,
  RatingLink,
  RatingPanel,
  RelatedColours,
  ReturnsLine,
  ReviewGrid,
  ReviewSourceNote,
  Selection,
  StickyBar,
  StockLine,
  SupportCard,
  TrustCards,
  VideoSlot,
} from "./blocks";
import type { Size } from "@/lib/sizes";
import type { PreviewData } from "./types";
import { usePurchase, type Offer } from "./usePurchase";

export function Concept01({ d, basePath, initialOffer, initialSize }: { d: PreviewData; basePath: string; initialOffer: Offer; initialSize: Size | null }) {
  const [p, zoneRef] = usePurchase({ product: d.product, bundleOptions: d.bundleOptions, initialOffer, initialSize, basePath });
  const stock = d.stock[d.product.id];

  return (
    <>
      <section className="container-x grid gap-6 pb-14 pt-4 md:gap-10 lg:grid-cols-12 lg:gap-14 lg:pb-20 lg:pt-8">
        <div className="lg:col-span-6 xl:col-span-7">
          {/* Mobile: a shorter square photo so name, rating, price and stock fit on the first screen. */}
          <div className="shot relative mx-auto aspect-[6/5] max-w-[460px] overflow-hidden rounded-2xl bg-studio md:hidden">
            {d.product.images[0] && <Image src={d.product.images[0].url} alt={d.product.images[0].alt || d.product.name} fill priority sizes="100vw" className="object-cover" />}
          </div>
          <div className="mx-auto hidden md:block md:max-w-[520px] lg:sticky lg:top-28 lg:max-w-none">
            <Gallery key={d.product.id} images={d.product.images} name={d.product.name} />
          </div>
        </div>

        <div className="lg:col-span-6 xl:col-span-5">
          {/* 1. What it is, what others think, is it available, when does it arrive */}
          <h1 className="display text-[26px] uppercase leading-[0.95] sm:text-[38px]">{d.product.name}</h1>
          <p className="mt-2 text-[15px] text-ink-2">{d.product.tagline}</p>
          <RatingLink summary={d.summary} className="mt-1" />
          <div className="mt-1 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
            <p className="flex items-baseline gap-3">
              <span className="price text-[36px] leading-none">{formatEUR(p.total)}</span>
              {p.offer === "bundle" && p.savings > 0 && <span className="text-lg text-muted line-through">{formatEUR(p.bundleFull)}</span>}
            </p>
            <p className="pb-1 text-xs text-muted">TTC · livraison {d.freeShipping ? "offerte" : "en sus"}</p>
          </div>
          <StockLine info={stock} size={p.offer === "single" ? p.size : null} className="mt-3" />
          <DeliveryEstimate plan={d.plan} free={d.freeShipping} variant="split" className="mt-4" />

          {/* 2. Offer, colour, size */}
          <div ref={zoneRef} id="acheter" className="scroll-mt-28">
            <div className="mt-7 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">Choisis ton offre</p>
            </div>
            {d.countdown && <CountdownRow data={d.countdown} sample={d.countdown.sample} className="mt-3" />}
            <div className="mt-3">
              <OfferSelector p={p} d={d} variant="cards" />
            </div>
            <div className="mt-7 border-t border-line pt-6">
              <Selection p={p} d={d} />
            </div>

            {/* 3. Price recap + button + returns right under it */}
            <div className="mt-7 border-t border-line pt-5">
              <div className="mb-4 flex items-baseline justify-between gap-3">
                <span className="text-sm text-ink-2">{p.offer === "bundle" ? `Total pour 2 vestes` : "Total"}</span>
                <span className="flex items-baseline gap-2">
                  {p.offer === "bundle" && p.savings > 0 && <span className="text-sm font-semibold text-[#8fd9ad]">−{formatEUR(p.savings)}</span>}
                  <span className="price text-[28px] leading-none">{formatEUR(p.total)}</span>
                </span>
              </div>
              <CtaButton p={p} />
              <ReturnsLine d={d} className="mt-4" />
              <PaymentNote d={d} className="mt-2" />
            </div>
          </div>

          {/* 4. What happens after the order */}
          <DeliveryTimeline plan={d.plan} className="mt-7" />
          <TrustCards d={d} className="mt-3" />
          <DetailsAccordion product={d.product} className="mt-8" />
        </div>
      </section>

      <section id="avis" aria-labelledby="avis-title" className="scroll-mt-24 border-t border-line py-14 lg:py-20">
        <div className="container-x">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <p className="lab">Avis clients</p>
                <ReviewSourceNote d={d} />
              </div>
              <h2 id="avis-title" className="display mt-3 text-[26px] uppercase sm:text-[44px]">Ils l&apos;ont adoptée.</h2>
              <p className="mt-2 text-sm text-muted">Avis sur la Veste Brésil, tous coloris confondus, relus avant publication.</p>
            </div>
            <RatingPanel summary={d.summary} className="lg:min-w-[440px]" />
          </div>
          <ReviewGrid d={d} className="mt-8" />
        </div>
      </section>

      <VideoSlot className="container-x border-t border-line py-14 lg:py-20" />

      <section aria-labelledby="faq-title" className="border-t border-line py-14 lg:py-20">
        <div className="container-x grid gap-8 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-7">
            <p className="lab">FAQ</p>
            <h2 id="faq-title" className="display mt-3 text-[26px] uppercase sm:text-[44px] lg:text-[36px] xl:text-[44px]">Questions fréquentes.</h2>
            <FaqList d={d} className="mt-8" />
          </div>
          <div className="lg:col-span-5 lg:pt-[92px]">
            <SupportCard d={d} />
          </div>
        </div>
      </section>

      <section aria-labelledby="related-title" className="border-t border-line py-14 lg:py-20">
        <div className="container-x">
          <p className="lab">Les autres coloris</p>
          <h2 id="related-title" className="display mt-3 text-[26px] uppercase sm:text-[40px]">Complète ton pack.</h2>
          <RelatedColours d={d} basePath={basePath} className="mt-8" />
        </div>
      </section>

      <StickyBar p={p} d={d} />
    </>
  );
}
