"use client";

import { useState } from "react";
import type { RatingSummary } from "@/lib/marketing";
import type { PublicReview } from "@/lib/reviews";
import { Modal } from "@/components/ui/Modal";
import { PreviewTag, RatingPanel, ReviewCard } from "@/components/store/pdp/blocks";

/**
 * Homepage reviews: published reviews only (nothing rendered when there is none).
 * Phones get a swipeable row of readable cards; desktop a three-column grid.
 */
export function HomeReviews({ summary, reviews, previewSource }: { summary: RatingSummary; reviews: PublicReview[]; previewSource: boolean }) {
  const [photo, setPhoto] = useState<string | null>(null);
  if (summary.count === 0) return null;
  const ordered = [...reviews].sort((a, b) => b.photos.length - a.photos.length);
  return (
    <section id="avis" aria-labelledby="avis-title" className="scroll-mt-20 border-t border-line py-14 lg:py-24">
      <div className="container-x">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="lab">Avis clients</p>
              {previewSource && <PreviewTag>Aperçu · avis publiés en production</PreviewTag>}
            </div>
            <h2 id="avis-title" className="display t-section mt-2 uppercase">Ce qu&apos;ils en disent.</h2>
            <p className="mt-2 text-[15px] text-muted">Avis sur la Veste Brésil, tous coloris confondus, relus avant publication.</p>
          </div>
          <RatingPanel summary={summary} className="lg:min-w-[440px]" />
        </div>
        <ul
          className="no-scrollbar -mx-4 mt-8 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-4 lg:overflow-visible lg:px-0"
          aria-label="Avis clients, faire défiler"
        >
          {ordered.slice(0, 8).map((r) => (
            <li key={r.id} className="w-[78%] max-w-[320px] shrink-0 snap-start lg:w-auto lg:max-w-none">
              <ReviewCard r={r} onPhoto={setPhoto} photoTall />
            </li>
          ))}
        </ul>
      </div>
      <Modal open={photo !== null} onClose={() => setPhoto(null)} title="Photo client" className="max-w-2xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {photo && <img src={photo} alt="Photo partagée par un client" className="max-h-[70dvh] w-full rounded-xl object-contain" />}
      </Modal>
    </section>
  );
}
