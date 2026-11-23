"use client";
import { useState } from "react";
import type { RatingSummary } from "@/lib/marketing";
import type { PublicReview } from "@/lib/reviews";
import { Modal } from "@/components/ui/Modal";
import { Stars } from "./Stars";
import { PreviewTag } from "./pdp/blocks";
import { useT } from "@/i18n/client";

export function HomeReviews({ summary, reviews, previewSource }: { summary: RatingSummary; reviews: PublicReview[]; previewSource: boolean }) {
  const { t, locale } = useT();
  const [photo,setPhoto] = useState<string | null>(null);
  const [shown,setShown] = useState(8);
  if (!summary.count) return null;
  const ordered = [...reviews].sort((a,b) => Number(b.photos.length > 0) - Number(a.photos.length > 0));
  return <section id="avis" className="home-reviews section-space scroll-mt-32" aria-labelledby="avis-title"><div className="container-x">
    <div className="section-heading"><div><div className="flex flex-wrap gap-3"><p className="lab">{t("Les mots de la communauté")}</p>{previewSource && <PreviewTag>{t("Aperçu")}</PreviewTag>}</div><h2 id="avis-title" className="display t-section mt-3">{t("Ce qu'ils en disent.")}</h2><p className="mt-3 text-sm text-muted">{t("Leurs photos. Leurs mots. Tous les coloris réunis.")}</p></div>
      <a href="#review-grid" className="review-score"><Stars value={summary.average} size={17}/><span><strong>{summary.average.toLocaleString("fr-FR", {minimumFractionDigits:1})} / 5</strong> · {locale === "es" && summary.count === 1 ? t("1 avis publié") : t("{n} avis publiés", { n: summary.count })}</span></a>
    </div>
    <ul id="review-grid" className="review-masonry" aria-label={t("Avis et photos des clients")}>{ordered.slice(0,shown).map((r,i) => <li key={r.id} className="review-editorial-card">
      {r.photos[0] && <button className={"review-photo " + (i % 3 === 1 ? "review-photo-square" : "")} onClick={() => setPhoto(r.photos[0])} aria-label={t("Agrandir la photo de {name}", { name: r.author })}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={r.photos[0]} alt={t("Photo partagée par {name}", { name: r.author })} loading="lazy" decoding="async" width="480" height="600" />
        <span aria-hidden="true">↗</span>
      </button>}
      <div className="review-copy"><Stars value={r.rating} size={13}/>{r.title && <h3 className="mt-3 font-semibold">{r.title}</h3>}<p className="mt-3">{r.text}</p><p className="review-author">{r.author}{r.verified && <span>{t("Achat vérifié")}</span>}</p></div>
    </li>)}</ul>
    {shown < ordered.length && <div className="mt-9 text-center"><button className="review-more" onClick={() => setShown(s => s + 8)}>{t("Voir plus d'avis")} <span className="text-muted">({ordered.length - shown})</span><span aria-hidden="true">+</span></button></div>}
    <p className="mt-5 text-center text-xs text-muted">{t("Avis sur le modèle Veste Brésil, relus avant publication.")}</p>
  </div><Modal open={photo !== null} onClose={() => setPhoto(null)} title={t("Photo client")} className="max-w-2xl">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    {photo && <img src={photo} alt={t("Photo partagée par un client")} className="max-h-[70dvh] w-full rounded-xl object-contain" />}
  </Modal></section>;
}
