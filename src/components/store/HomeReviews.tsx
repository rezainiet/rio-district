"use client";
import { useState } from "react";
import type { RatingSummary } from "@/lib/marketing";
import type { PublicReview } from "@/lib/reviews";
import { Modal } from "@/components/ui/Modal";
import { Stars } from "./Stars";
import { PreviewTag } from "./pdp/blocks";

export function HomeReviews({ summary, reviews, previewSource }: { summary: RatingSummary; reviews: PublicReview[]; previewSource: boolean }) {
  const [photo,setPhoto] = useState<string | null>(null);
  const [shown,setShown] = useState(8);
  if (!summary.count) return null;
  const ordered = [...reviews].sort((a,b) => Number(b.photos.length > 0) - Number(a.photos.length > 0));
  return <section id="avis" className="home-reviews section-space scroll-mt-32" aria-labelledby="avis-title"><div className="container-x">
    <div className="section-heading"><div><div className="flex flex-wrap gap-3"><p className="lab">Les mots de la communauté</p>{previewSource && <PreviewTag>Aperçu</PreviewTag>}</div><h2 id="avis-title" className="display t-section mt-3">Ce qu&apos;ils en disent.</h2><p className="mt-3 text-sm text-muted">Leurs photos. Leurs mots. Tous les coloris réunis.</p></div>
      <a href="#review-grid" className="review-score"><Stars value={summary.average} size={17}/><span><strong>{summary.average.toLocaleString("fr-FR", {minimumFractionDigits:1})} / 5</strong> · {summary.count} avis publiés</span></a>
    </div>
    <ul id="review-grid" className="review-masonry" aria-label="Avis et photos des clients">{ordered.slice(0,shown).map((r,i) => <li key={r.id} className="review-editorial-card">
      {r.photos[0] && <button className={"review-photo " + (i % 3 === 1 ? "review-photo-square" : "")} onClick={() => setPhoto(r.photos[0])} aria-label={"Agrandir la photo de " + r.author}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={r.photos[0]} alt={"Photo partagée par " + r.author} loading="lazy" decoding="async" width="480" height="600" />
        <span aria-hidden="true">↗</span>
      </button>}
      <div className="review-copy"><Stars value={r.rating} size={13}/>{r.title && <h3 className="mt-3 font-semibold">{r.title}</h3>}<p className="mt-3">{r.text}</p><p className="review-author">{r.author}{r.verified && <span>Achat vérifié</span>}</p></div>
    </li>)}</ul>
    {shown < ordered.length && <div className="mt-9 text-center"><button className="review-more" onClick={() => setShown(s => s + 8)}>Voir plus d&apos;avis <span className="text-muted">({ordered.length - shown})</span><span aria-hidden="true">+</span></button></div>}
    <p className="mt-5 text-center text-xs text-muted">Avis sur le modèle Veste Brésil, relus avant publication.</p>
  </div><Modal open={photo !== null} onClose={() => setPhoto(null)} title="Photo client" className="max-w-2xl">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    {photo && <img src={photo} alt="Photo partagée par un client" className="max-h-[70dvh] w-full rounded-xl object-contain" />}
  </Modal></section>;
}
