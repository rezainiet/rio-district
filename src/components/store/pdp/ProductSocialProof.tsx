"use client";

import { useRef, useState } from "react";
import type { PublicReview } from "@/lib/reviews";
import { Modal } from "@/components/ui/Modal";
import { Stars } from "@/components/store/Stars";
import { CustomerVideos } from "@/components/store/CustomerVideos";
import { EmptyReviews, ReviewSourceNote, useReviewModals } from "./blocks";
import type { PreviewData } from "./types";
import { useT } from "@/i18n/client";

export function ProductSocialProof({ d }: { d: PreviewData }) {
  const { t } = useT();
  const n = d.summary.count;
  const [page,setPage] = useState(0);
  const [selected,setSelected] = useState<PublicReview | null>(null);
  const [all,setAll] = useState(false);
  const rail = useRef<HTMLUListElement>(null);
  const {setWriting,modals} = useReviewModals(d);
  const ordered = [...d.reviews].sort((a,b) => Number(b.photos.length > 0) - Number(a.photos.length > 0));
  const pages = Math.ceil(ordered.length / 3);
  const movePage = (delta: number) => {
    setPage(p => Math.max(0,Math.min(pages - 1,p + delta)));
    rail.current?.scrollTo({left:0,behavior:"instant"});
  };
  return <section id="avis" className="pdp-community" aria-labelledby="avis-title"><div className="container-x pdp-community-grid">
    <div className="pdp-review-panel">
      <div className="pdp-social-heading"><div><div className="pdp-review-eyebrow"><p className="lab">{t("La communauté Rio")}</p><ReviewSourceNote d={d}/></div><h2 id="avis-title" className="display">{t("Ils l’ont adoptée.")}</h2></div>
        {pages > 1 && <div className="pdp-review-arrows"><button disabled={page === 0} onClick={() => movePage(-1)} aria-label={t("Avis précédents")}>←</button><button disabled={page === pages - 1} onClick={() => movePage(1)} aria-label={t("Avis suivants")}>→</button></div>}
      </div>
      {d.summary.count > 0 && <p className="pdp-social-rating"><Stars value={d.summary.average} size={14}/><strong>{d.summary.average.toLocaleString("fr-FR",{minimumFractionDigits:1})}/5</strong><span>· {n === 1 ? t("1 avis sur le modèle") : t("{n} avis sur le modèle", { n })}</span></p>}
      {d.summary.count === 0 ? <EmptyReviews onWrite={() => setWriting(true)}/> : <ul ref={rail} className="pdp-review-cards no-scrollbar" aria-label={t("Avis clients")}>{ordered.slice(page * 3,page * 3 + 3).map(r => <li key={r.id}><article className="pdp-review-card">
        {r.photos[0] && <button className="pdp-review-image" onClick={() => setSelected(r)} aria-label={t("Lire l’avis et agrandir la photo de {author}", { author: r.author })}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={r.photos[0]} alt={t("Photo de {author}", { author: r.author })} loading="lazy" decoding="async" width="400" height="300"/><span aria-hidden="true">↗</span>
        </button>}
        <div className="pdp-review-body"><Stars value={r.rating} size={12}/><p className="pdp-review-excerpt">{r.text}</p><div className="pdp-review-byline"><strong>{r.author}</strong><button onClick={() => setSelected(r)} aria-label={t("Lire l’avis complet de {author}", { author: r.author })}>{t("Lire l’avis")} ↗</button></div>{r.verified && <span className="pdp-verified">{t("Achat vérifié")}</span>}</div>
      </article></li>)}</ul>}
      <div className="pdp-review-actions">{d.summary.count > 0 && <button onClick={() => setAll(true)}>{t("Voir les {n} avis", { n })} <span aria-hidden="true">↗</span></button>}<button onClick={() => setWriting(true)}>{t("Écrire un avis")} <span aria-hidden="true">+</span></button></div>
    </div>
    <CustomerVideos compact/>
  </div>
    <Modal open={selected !== null} onClose={() => setSelected(null)} title={selected ? t("L’avis de {author}", { author: selected.author }) : t("Avis client")} className="max-w-lg">{selected && <div className="pdp-full-review">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {selected.photos[0] && <img src={selected.photos[0]} alt={t("Photo de {author}", { author: selected.author })} className="pdp-full-review-photo"/>}<Stars value={selected.rating} size={15}/>{selected.title && <h3>{selected.title}</h3>}<p>{selected.text}</p>{selected.verified && <span>{t("Achat vérifié")}</span>}
    </div>}</Modal>
    <Modal open={all} onClose={() => setAll(false)} title={t("Les {n} avis de la communauté", { n })} className="max-w-2xl"><ul className="pdp-all-reviews">{d.reviews.map(r => <li key={r.id}><Stars value={r.rating} size={13}/><strong>{r.author}</strong><p>{r.text}</p>{r.verified && <span>{t("Achat vérifié")}</span>}</li>)}</ul></Modal>
    {modals}
  </section>;
}
