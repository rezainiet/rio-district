"use client";

/* CONCEPT 02 — PREMIUM FASHION COMMERCE
   Editorial stage + a refined purchase panel. Same information as 01, staged like a fashion house. */
import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";
import { useState } from "react";
import { artClass } from "@/lib/image-fit";
import { formatEUR } from "@/lib/money";
import { Modal } from "@/components/ui/Modal";
import { ZoomIcon } from "@/components/ui/icons";
import { Stars } from "@/components/store/Stars";
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
  ReturnsLine,
  ReviewCarousel,
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

function Stage({ d, basePath }: { d: PreviewData; basePath: string }) {
  const [zoom, setZoom] = useState(false);
  const img = d.product.images[0];
  return (
    <div>
      <div className="shot spotlight relative aspect-[4/5] overflow-hidden rounded-[22px] bg-studio lg:aspect-[5/6]">
        {img && <Image src={img.url} alt={img.alt || d.product.name} fill priority sizes="(min-width: 1024px) 55vw, 100vw" className={`object-cover ${artClass(img, "hero")}`} />}
        <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/75 to-transparent lg:h-1/3 lg:from-black/55" />
        <p className="absolute bottom-4 left-4 hidden text-[11px] font-semibold uppercase tracking-[0.24em] text-white/85 sm:bottom-6 sm:left-6 lg:block">Coloris · {d.product.color.name}</p>
        {/* Mobile: the essentials ride on the photo, so the first screen already says what, how much, how rated. */}
        <div className="absolute inset-x-4 bottom-4 pr-14 text-white lg:hidden">
          <p className="font-display text-[22px] font-extrabold uppercase leading-none">{d.product.name}</p>
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="price text-xl">{formatEUR(d.product.priceCents)}</span>
            {d.summary.count > 0 && (
              <a href="#avis" className="inline-flex min-h-9 items-center gap-1.5 font-semibold">
                <span className="text-brand" aria-hidden>★</span> {d.summary.average.toLocaleString("fr-FR", { minimumFractionDigits: 1 })} · {d.summary.count} avis
              </a>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setZoom(true)}
          className="absolute bottom-3 right-3 grid size-11 place-items-center rounded-full bg-black/45 text-white backdrop-blur transition hover:bg-black/70 sm:bottom-5 sm:right-5"
          aria-label="Agrandir la photo"
        >
          <ZoomIcon width={18} height={18} />
        </button>
      </div>
      {/* The six colourways as a lookbook strip (each is its own product page). */}
      <ul className="mt-3 grid grid-cols-6 gap-1.5 sm:gap-2" aria-label="Coloris">
        {d.siblings.map((s) => (
          <li key={s.id}>
            <Link
              href={`${basePath}/${s.slug}`}
              scroll={false}
              aria-current={s.id === d.product.id ? "true" : undefined}
              aria-label={`Coloris ${s.color.name}`}
              className={clsx("relative block aspect-[4/5] overflow-hidden rounded-lg bg-studio transition", s.id === d.product.id ? "ring-2 ring-brand ring-offset-2 ring-offset-paper" : "opacity-70 hover:opacity-100")}
            >
              {s.images[0] && <Image src={s.images[0].url} alt="" fill sizes="90px" className={`object-cover ${artClass(s.images[0], "thumb")}`} />}
            </Link>
          </li>
        ))}
      </ul>
      <Modal open={zoom} onClose={() => setZoom(false)} title={d.product.name} className="max-w-3xl">
        {img && (
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-studio">
            <Image src={img.url} alt={img.alt || d.product.name} fill sizes="768px" className="object-contain" />
          </div>
        )}
      </Modal>
    </div>
  );
}

export function Concept02({ d, basePath, initialOffer, initialSize }: { d: PreviewData; basePath: string; initialOffer: Offer; initialSize: Size | null }) {
  const [p, zoneRef] = usePurchase({ product: d.product, bundleOptions: d.bundleOptions, initialOffer, initialSize, basePath });
  const stock = d.stock[d.product.id];
  const w = deliveryWords(d.plan);
  const featured = d.reviews.find((r) => r.text.length > 80 && r.rating >= 4) ?? d.reviews[0];

  return (
    <>
      <section className="container-x grid gap-8 pb-16 pt-4 lg:grid-cols-12 lg:gap-12 lg:pb-24 lg:pt-8 xl:gap-16">
        <div className="lg:col-span-7">
          <div className="lg:sticky lg:top-28">
            <Stage d={d} basePath={basePath} />
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="lg:rounded-[26px] lg:border lg:border-line lg:bg-[#0f0f11] lg:p-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand">Rio District · Veste Brésil</p>
            <h1 className="display mt-3 text-[30px] uppercase leading-[0.92] sm:text-[40px] lg:text-[34px] xl:text-[40px]">{d.product.name}</h1>
            <RatingLink summary={d.summary} className="mt-2" />
            <p className="mt-1 text-[15px] text-ink-2">{d.product.tagline}</p>

            <div className="mt-6 flex items-end justify-between gap-4 border-y border-line py-5">
              <p>
                <span className="price block text-[40px] leading-none">{formatEUR(p.total)}</span>
                <span className="mt-1.5 block text-xs text-muted">
                  TTC · {p.offer === "bundle" ? <><span className="line-through">{formatEUR(p.bundleFull)}</span> pour 2 vestes</> : "la veste"}
                </span>
              </p>
              <StockLine info={stock} size={p.offer === "single" ? p.size : null} pill className="max-w-[60%] text-[13px]" />
            </div>
            <p className="flex items-start gap-2.5 border-b border-line py-4 text-sm text-ink-2">
              <span className="mt-1.5 size-2 shrink-0 rounded-full bg-[#6fbf8f]" aria-hidden />
              <span><span className="font-semibold text-ink">Commande aujourd&apos;hui, livrée {w.long}</span> · livraison {d.freeShipping ? "offerte et suivie" : "suivie"}</span>
            </p>

            <div ref={zoneRef} id="acheter" className="scroll-mt-28 pt-6">
              {d.countdown && <CountdownRow data={d.countdown} sample={d.countdown.sample} variant="chip" className="mb-3" />}
              <OfferSelector p={p} d={d} variant="tiles" />
              <div className="mt-6">
                <Selection p={p} d={d} />
              </div>
              <CtaButton p={p} className="mt-6" />
              <ReturnsLine d={d} className="mt-4" />
              <PaymentNote d={d} className="mt-3" />
            </div>
          </div>
          <DetailsAccordion product={d.product} className="mt-8" />
        </div>
      </section>

      <section aria-labelledby="livraison-title" className="border-t border-line py-16 lg:py-24">
        <div className="container-x">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="lab">Après ta commande</p>
              <h2 id="livraison-title" className="display mt-3 text-[26px] uppercase sm:text-[44px]">De chez nous à chez toi.</h2>
            </div>
            <p className="max-w-md text-sm text-ink-2">Commandée aujourd&apos;hui, ta veste est livrée {w.long}. Le numéro de suivi t&apos;est envoyé par e-mail à l&apos;expédition.</p>
          </div>
          <DeliveryTimeline plan={d.plan} variant="editorial" className="mt-10" />
          <TrustCards d={d} variant="editorial" className="mt-4" />
        </div>
      </section>

      <section id="avis" aria-labelledby="avis-title" className="scroll-mt-24 border-t border-line py-16 lg:py-24">
        <div className="container-x">
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
            <div className="lg:col-span-5">
              <div className="flex flex-wrap items-center gap-3">
                <p className="lab">Avis clients</p>
                <ReviewSourceNote d={d} />
              </div>
              <h2 id="avis-title" className="display mt-3 text-[26px] uppercase sm:text-[44px] lg:text-[32px] xl:text-[44px]">Ils l&apos;ont adoptée.</h2>
              <RatingPanel summary={d.summary} className="mt-8" />
            </div>
            {featured && (
              <figure className="relative flex flex-col justify-center rounded-[26px] border border-line bg-[#0f0f11] p-7 sm:p-10 lg:col-span-7">
                <span aria-hidden className="font-display text-[88px] leading-[0.6] text-brand/60">“</span>
                <blockquote className="mt-2 font-display text-[22px] font-semibold leading-snug sm:text-[28px]">{featured.text}</blockquote>
                <figcaption className="mt-6 flex items-center gap-3 text-sm">
                  <Stars value={featured.rating} size={14} />
                  <span className="font-semibold">{featured.author}</span>
                  {featured.verified && <span className="text-[#8fd9ad]">· Achat vérifié</span>}
                </figcaption>
              </figure>
            )}
          </div>
          <ReviewCarousel d={d} className="mt-10" onSeeAll={() => document.getElementById("tous-les-avis")?.setAttribute("open", "")} />
          {d.reviews.length > 0 && (
            <details id="tous-les-avis" className="group mt-6 rounded-2xl border border-line">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between px-5 text-sm font-semibold">
                Tous les avis ({d.reviews.length}) <span className="text-xl text-muted transition-transform group-open:rotate-45" aria-hidden>+</span>
              </summary>
              <ul className="divide-y divide-line border-t border-line">
                {d.reviews.map((r) => (
                  <li key={r.id} className="grid gap-2 px-5 py-4 sm:grid-cols-[160px_1fr] sm:gap-6">
                    <span className="text-sm"><Stars value={r.rating} size={12} /><span className="mt-1 block font-semibold">{r.author}</span></span>
                    <p className="text-[15px] leading-relaxed text-ink-2">{r.text}</p>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      </section>

      <VideoSlot className="container-x border-t border-line py-16 lg:py-24" />

      <section aria-labelledby="faq-title" className="border-t border-line py-16 lg:py-24">
        <div className="container-x grid gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-5">
            <p className="lab">Aide</p>
            <h2 id="faq-title" className="display mt-3 text-[26px] uppercase sm:text-[40px] lg:text-[26px] xl:text-[32px]">Tout savoir avant de commander.</h2>
            <SupportCard d={d} className="mt-8" />
          </div>
          <FaqList d={d} className="lg:col-span-7" />
        </div>
      </section>

      <StickyBar p={p} d={d} />
    </>
  );
}
