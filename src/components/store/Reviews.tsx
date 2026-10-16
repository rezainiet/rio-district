"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { MIN_REVIEWS_FOR_DISTRIBUTION, formatParisDate, type RatingSummary } from "@/lib/marketing";
import type { PublicReview } from "@/lib/reviews";
import { Stars } from "./Stars";
import { ReviewForm } from "./ReviewForm";

const PAGE = 6;

/**
 * Customer reviews (published by an admin only). Nothing is invented: with no
 * published review the section shows an honest empty state on product pages
 * and is not rendered at all on the homepage.
 */
export function Reviews({
  summary,
  reviews,
  variant,
  product,
}: {
  summary: RatingSummary;
  reviews: PublicReview[];
  variant: "product" | "home";
  product?: { id: string; name: string };
}) {
  const [shown, setShown] = useState(PAGE);
  const [writing, setWriting] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);

  if (variant === "home" && summary.count === 0) return null;
  const canWrite = variant === "product" && product;
  const remaining = reviews.length - shown;

  return (
    <section id="avis" aria-labelledby="avis-title" className="scroll-mt-24 border-t border-line py-20 lg:py-28">
      <div className="container-x">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="lab">Avis clients</p>
            <h2 id="avis-title" className="display mt-3 text-[30px] uppercase sm:text-[44px] lg:text-[56px]">
              {variant === "home" ? "Ce qu'ils en disent." : "Ils l'ont adoptée."}
            </h2>
            {variant === "product" && summary.count > 0 && (
              <p className="mt-3 text-sm text-muted">Avis sur la Veste Brésil, tous coloris confondus.</p>
            )}
          </div>

          {summary.count > 0 && (
            <div className="flex flex-col gap-6 rounded-[18px] border border-line bg-paper-2 p-6 sm:flex-row sm:items-center sm:gap-10 lg:min-w-[440px]">
              <div>
                <p className="flex items-baseline gap-2">
                  <span className="price price-strong text-[56px] leading-none">{summary.average.toLocaleString("fr-FR", { minimumFractionDigits: 1 })}</span>
                  <span className="text-ink-2">/ 5</span>
                </p>
                <Stars value={summary.average} size={18} className="mt-3" />
                <p className="mt-2 text-sm text-muted">
                  {summary.count} avis publié{summary.count > 1 ? "s" : ""}
                </p>
              </div>
              {summary.count >= MIN_REVIEWS_FOR_DISTRIBUTION && (
                <dl className="grid flex-1 gap-1.5 text-xs text-ink-2" aria-label="Répartition des notes">
                  {([5, 4, 3, 2, 1] as const).map((n) => {
                    const c = summary.distribution[n];
                    return (
                      <div key={n} className="grid grid-cols-[28px_1fr_24px] items-center gap-2.5">
                        <dt className="tabular-nums">{n} ★</dt>
                        <dd className="h-1.5 overflow-hidden rounded-full bg-paper-3">
                          <span className="block h-full rounded-full bg-brand" style={{ width: `${(c / summary.count) * 100}%` }} />
                        </dd>
                        <dd className="text-right tabular-nums text-muted">{c}</dd>
                      </div>
                    );
                  })}
                </dl>
              )}
            </div>
          )}
        </div>

        {summary.count === 0 ? (
          <div className="mt-10 rounded-[18px] border border-dashed border-line-strong px-6 py-14 text-center">
            <Stars value={0} size={20} label="Aucune note pour le moment" />
            <p className="mt-5 font-display text-lg font-bold uppercase">Aucun avis publié pour le moment.</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted">
              Les avis sont relus avant publication. Tu as reçu ta veste ? Partage ton ressenti avec la communauté.
            </p>
            {canWrite && (
              <Button size="lg" className="mt-7" onClick={() => setWriting(true)}>
                Écrire un avis
              </Button>
            )}
          </div>
        ) : (
          <>
            <ul className="mt-10 grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
              {reviews.slice(0, shown).map((r) => (
                <li key={r.id} className="flex flex-col rounded-[18px] border border-line bg-paper-2 p-6">
                  <div className="flex items-center justify-between gap-3">
                    <Stars value={r.rating} size={15} />
                    {r.date && <time dateTime={r.date} className="text-xs text-muted">{formatParisDate(r.date)}</time>}
                  </div>
                  {r.title && <h3 className="mt-4 font-display text-base font-bold uppercase leading-snug">{r.title}</h3>}
                  <p className="mt-2 whitespace-pre-line break-words text-[15px] leading-relaxed text-ink-2">{r.text}</p>
                  {r.photos.length > 0 && (
                    <ul className="mt-4 flex gap-2">
                      {r.photos.map((src, i) => (
                        <li key={src}>
                          <button
                            type="button"
                            onClick={() => setPhoto(src)}
                            className="block size-16 overflow-hidden rounded-xl border border-line transition-opacity hover:opacity-80"
                            aria-label={`Agrandir la photo ${i + 1} de ${r.author}`}
                          >
                            {/* Customer photos are served by a gated route, not the image optimizer. */}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={src} alt="" loading="lazy" className="size-full object-cover" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-5 text-sm">
                    <span className="font-semibold">{r.author}</span>
                    {r.color && <span className="text-muted">Coloris {r.color}</span>}
                    {r.verified && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-brand">
                        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
                          <path d="M2 6.2l2.6 2.6L10 3.4" fill="none" stroke="currentColor" strokeWidth="1.6" />
                        </svg>
                        Achat vérifié
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              {remaining > 0 && (
                <Button size="lg" variant="ghost" className="w-full border border-line-strong hover:bg-paper-3 sm:w-auto" onClick={() => setShown((s) => s + PAGE)}>
                  Voir plus d&apos;avis ({remaining})
                </Button>
              )}
              {canWrite && (
                <Button size="lg" className="w-full sm:w-auto" onClick={() => setWriting(true)}>
                  Écrire un avis
                </Button>
              )}
            </div>
          </>
        )}
      </div>

      {canWrite && (
        <Modal open={writing} onClose={() => setWriting(false)} title="Ton avis" description={product.name} className="max-w-xl">
          {writing && <ReviewForm productId={product.id} onDone={() => setWriting(false)} />}
        </Modal>
      )}
      <Modal open={photo !== null} onClose={() => setPhoto(null)} title="Photo client" className="max-w-2xl">
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="Photo partagée par un client" className="max-h-[70dvh] w-full rounded-xl object-contain" />
        )}
      </Modal>
    </section>
  );
}
