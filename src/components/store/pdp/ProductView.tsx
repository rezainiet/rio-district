"use client";

/* Product page (mobile-first). Order of information, from the KALT audit and the design review:
   photo → name → rating → price → stock → delivery date → offer → colour → size → button →
   returns → what happens next → guarantees → details → reviews → FAQ → other colours. */
import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";
import { useState } from "react";
import { formatEUR } from "@/lib/money";
import { artClass } from "@/lib/image-fit";
import type { Size } from "@/lib/sizes";
import { Gallery } from "@/components/store/Gallery";
import { Modal } from "@/components/ui/Modal";
import { MailIcon, ZoomIcon } from "@/components/ui/icons";
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
  ReviewCarousel,
  ReviewGrid,
  ReviewSourceNote,
  Selection,
  StickyBar,
  StockLine,
  SupportCard,
  TrustCards,
} from "./blocks";
import type { PreviewData } from "./types";
import { usePurchase, type Offer } from "./usePurchase";

/** Mobile photo: shorter than the screen so the essentials stay visible; colour dots switch the jacket. */
function MobilePhoto({ d, basePath }: { d: PreviewData; basePath: string }) {
  const [zoom, setZoom] = useState(false);
  const img = d.product.images[0];
  return (
    <div className="md:hidden">
      <div className="shot relative -mx-4 aspect-[6/5] sm:-mx-6">
        {img && <Image src={img.url} alt={img.alt || d.product.name} fill priority sizes="100vw" className={`object-cover object-[50%_42%] ${artClass(img, "hero")}`} />}
        <button
          type="button"
          onClick={() => setZoom(true)}
          className="absolute right-3 top-3 z-10 grid size-11 place-items-center rounded-full bg-black/45 text-white backdrop-blur transition hover:bg-black/70"
          aria-label="Agrandir la photo"
        >
          <ZoomIcon width={18} height={18} />
        </button>
        {d.siblings.length > 1 && (
          <ul className="absolute bottom-2 left-2 z-10 flex rounded-full bg-black/50 px-0.5 backdrop-blur" aria-label="Coloris">
            {d.siblings.map((s) => (
              <li key={s.id}>
                <Link
                  href={`${basePath}/${s.slug}`}
                  scroll={false}
                  aria-label={`Coloris ${s.color.name}`}
                  aria-current={s.id === d.product.id ? "true" : undefined}
                  className="grid size-11 place-items-center"
                >
                  <span className={clsx("block size-5 rounded-full", s.id === d.product.id ? "ring-2 ring-white ring-offset-2 ring-offset-black/60" : "ring-1 ring-white/40")} style={{ background: s.color.hex }} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Modal open={zoom} onClose={() => setZoom(false)} title={d.product.name} className="max-w-3xl">
        {img && (
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-studio">
            <Image src={img.url} alt={img.alt || d.product.name} fill sizes="100vw" className="object-contain" />
          </div>
        )}
      </Modal>
    </div>
  );
}

export function ProductView({
  d,
  basePath = "/produit",
  initialOffer,
  initialSize,
}: {
  d: PreviewData;
  basePath?: string;
  initialOffer: Offer;
  initialSize: Size | null;
}) {
  const [p, zoneRef] = usePurchase({ product: d.product, bundleOptions: d.bundleOptions, initialOffer, initialSize, basePath });
  const [allReviews, setAllReviews] = useState(false);
  const stock = d.stock[d.product.id];

  return (
    <>
      <nav aria-label="Fil d'Ariane" className="container-x hidden pt-6 text-[13px] text-muted md:block">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li><Link href="/" className="hover:text-ink">Accueil</Link></li>
          <li aria-hidden>/</li>
          <li><Link href="/#collection" className="hover:text-ink">Collection</Link></li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="text-ink-2">{d.product.name}</li>
        </ol>
      </nav>

      <section className="container-x grid gap-5 pb-12 md:gap-10 md:pt-6 lg:grid-cols-12 lg:gap-14 lg:pb-20">
        <div className="lg:col-span-7">
          <MobilePhoto d={d} basePath={basePath} />
          <div className="mx-auto hidden md:block md:max-w-[560px] lg:sticky lg:top-24 lg:max-w-none">
            <Gallery key={d.product.id} images={d.product.images} name={d.product.name} />
          </div>
        </div>

        <div className="lg:col-span-5">
          {/* What it is, what customers think, what it costs, is it there, when it arrives. */}
          <h1 className="display t-title uppercase">{d.product.name}</h1>
          {d.product.tagline && <p className="mt-1.5 text-[16px] leading-snug text-ink-2">{d.product.tagline}</p>}
          <RatingLink summary={d.summary} className="mt-1" />
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-2">
            <p className="flex items-baseline gap-2.5">
              <span className="price text-[38px] leading-none">{formatEUR(p.total)}</span>
              {p.offer === "bundle" && p.savings > 0 && <s className="text-lg text-muted">{formatEUR(p.bundleFull)}</s>}
            </p>
            {p.bundleAvailable && p.offer === "single" && (
              <button
                type="button"
                onClick={() => p.setOffer("bundle")}
                className="tap inline-flex min-h-10 items-center gap-1 rounded-full border border-[#4a3f2a] bg-[#17140f] px-3.5 text-[14px] text-ink-2 hover:border-brand"
              >
                ou 2 pour <span className="font-semibold text-brand">{formatEUR(p.bundlePrice)}</span>
              </button>
            )}
            {p.offer === "bundle" && p.savings > 0 && (
              <span className="inline-flex min-h-10 items-center rounded-full bg-[#1d3a2a] px-3.5 text-[14px] font-semibold text-[#8fd9ad]">{formatEUR(p.savings)} d&apos;économie</span>
            )}
          </div>
          <p className="mt-1 text-[13px] text-muted">TTC · livraison {d.freeShipping ? "offerte" : "en sus"}</p>
          <StockLine info={stock} size={p.offer === "single" ? p.size : null} className="mt-3" />
          <DeliveryEstimate plan={d.plan} free={d.freeShipping} variant="split" className="mt-4" />

          {/* Choose. */}
          <div ref={zoneRef} id="acheter" className="scroll-mt-24">
            {d.countdown && <CountdownRow data={d.countdown} sample={d.countdown.sample} className="mt-6" />}
            <p className="mb-2.5 mt-6 text-[13px] font-semibold uppercase tracking-[0.14em] text-muted">Ton offre</p>
            <OfferSelector p={p} d={d} variant="segmented" />
            <div className="mt-6">
              <Selection p={p} d={d} />
            </div>

            {/* Buy, with the reassurance right under the button. */}
            <CtaButton p={p} className="mt-6" />
            <ReturnsLine d={d} className="mt-4" />
            <p className="mt-2.5 flex items-start gap-2.5 text-sm text-ink-2">
              <MailIcon width={18} height={18} className="mt-0.5 shrink-0 text-brand" />
              <span>
                Une question sur la taille ou la livraison ?{" "}
                <Link href="/#contact" className="text-muted underline underline-offset-4 hover:text-ink">Écris-nous</Link>
              </span>
            </p>
            <PaymentNote d={d} className="mt-3" />
          </div>

          {/* What happens next. */}
          <DeliveryTimeline plan={d.plan} variant="compact" className="mt-7" />
          <TrustCards d={d} variant="rows" className="mt-3" />
          <DetailsAccordion product={d.product} className="mt-7" />
        </div>
      </section>

      <section id="avis" aria-labelledby="avis-title" className="scroll-mt-20 border-t border-line py-12 lg:py-20">
        <div className="container-x">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <p className="lab">Avis clients</p>
                <ReviewSourceNote d={d} />
              </div>
              <h2 id="avis-title" className="display t-section mt-2 uppercase">Ils l&apos;ont adoptée.</h2>
              <p className="mt-2 text-[15px] text-muted">Avis sur la Veste Brésil, tous coloris confondus, relus avant publication.</p>
            </div>
            <RatingPanel summary={d.summary} className="lg:min-w-[440px]" />
          </div>
          {/* Phones: one readable card at a time (swipe), the full list on demand. Desktop: the grid. */}
          {allReviews ? (
            <ReviewGrid d={d} className="mt-6" />
          ) : (
            <>
              <ReviewCarousel d={d} className="mt-6 md:hidden" onSeeAll={() => setAllReviews(true)} />
              <ReviewGrid d={d} className="mt-6 hidden md:block" />
            </>
          )}
        </div>
      </section>

      <section aria-labelledby="faq-title" className="border-t border-line py-12 lg:py-20">
        <div className="container-x grid gap-8 lg:grid-cols-12 lg:gap-14">
          <div className="min-w-0 lg:col-span-7">
            <p className="lab">FAQ</p>
            <h2 id="faq-title" className="display t-section mt-2 uppercase">Questions fréquentes.</h2>
            <FaqList d={d} className="mt-6" />
          </div>
          <div className="min-w-0 lg:col-span-5 lg:pt-[88px]">
            <SupportCard d={d} />
          </div>
        </div>
      </section>

      <section aria-labelledby="related-title" className="border-t border-line py-12 lg:py-20">
        <div className="container-x">
          <p className="lab">Les autres coloris</p>
          <h2 id="related-title" className="display t-section mt-2 uppercase">Complète ton pack.</h2>
          <RelatedColours d={d} basePath={basePath} className="mt-6" />
        </div>
      </section>

      <StickyBar p={p} d={d} />
    </>
  );
}
