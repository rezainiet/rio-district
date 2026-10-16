import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DEFAULT_PREVIEW_SLUG, DESIGN_CONCEPTS, RETURNS_PREVIEW_PATH, designReviewEnabled } from "@/lib/design-review";

export const metadata: Metadata = { title: "Revue de design — 3 concepts fiche produit", robots: { index: false, follow: false } };

const SCORES: Record<string, { total: number; note: string }> = {
  "product-01": { total: 8.6, note: "Recommandé : réponse la plus directe à la critique du client." },
  "product-02": { total: 7.9, note: "Le plus haut de gamme ; sur mobile, la date de livraison arrive après la photo." },
  "product-03": { total: 8.5, note: "Le plus rapide sur téléphone ; un peu plus dense, panneau d'achat qui défile sur ordinateur." },
};

/** Client-review index: the three concepts side by side, with their screenshots and live prototypes. Dev only. */
export default function DesignReviewIndex() {
  if (!designReviewEnabled()) notFound();
  const cap = (f: string) => `/design-review/captures/${f}`;
  return (
    <div className="container-x py-10 lg:py-16">
      <p className="lab">Revue de design · fiche produit</p>
      <h1 className="display mt-3 text-[26px] uppercase sm:text-[44px]">Trois concepts à valider.</h1>
      <p className="mt-3 max-w-3xl text-ink-2">
        Prototypes fonctionnels sur les vraies données de la boutique (produits, prix, panier, avis publiés en production). Les éléments marqués
        « Aperçu » sont des exemples clairement étiquetés : ils n&apos;apparaissent jamais en production. Aucune de ces pages n&apos;est publiée.
      </p>
      <p className="mt-4 flex flex-wrap gap-2 text-sm">
        <Link href={`/produit/${DEFAULT_PREVIEW_SLUG}`} className="inline-flex min-h-11 items-center rounded-full border border-line px-4 hover:border-ink">Page actuelle</Link>
        <a href="https://www.kaltshop.club/produit/veste-bresil-vert" target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-full border border-line px-4 hover:border-ink">Référence KALT ↗</a>
        <Link href={RETURNS_PREVIEW_PATH} className="inline-flex min-h-11 items-center rounded-full border border-line px-4 hover:border-ink">Page Retours & remboursements</Link>
      </p>

      <ul className="mt-10 grid gap-6 lg:grid-cols-3">
        {DESIGN_CONCEPTS.map((c) => {
          const short = c.key.replace("product-", "c");
          const s = SCORES[c.key];
          return (
            <li key={c.key} className={`flex flex-col rounded-[22px] border bg-paper-2 p-5 ${c.key === "product-01" ? "border-brand" : "border-line"}`}>
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-display text-sm font-bold tracking-[0.2em] text-brand">CONCEPT {c.num}</p>
                <p className="price text-2xl">{s.total.toLocaleString("fr-FR")}<span className="text-sm text-muted"> / 10</span></p>
              </div>
              <h2 className="mt-2 font-display text-xl font-bold uppercase">{c.name}</h2>
              <p className="mt-2 text-sm text-ink-2">{c.intent}</p>
              <p className="mt-2 text-sm text-brand">{s.note}</p>
              <div className="mt-5 grid grid-cols-[1fr_0.42fr] items-start gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cap(`${short}-desktop-1440-1-premier-ecran.jpg`)} alt={`Concept ${c.num}, ordinateur`} className="w-full rounded-lg border border-line" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cap(`${short}-mobile-390-1-premier-ecran.jpg`)} alt={`Concept ${c.num}, mobile`} className="w-full rounded-lg border border-line" />
              </div>
              <div className="mt-auto flex flex-wrap gap-2 pt-5 text-sm">
                <Link href={`/design-review/${c.key}?demo=1`} className="inline-flex min-h-11 items-center rounded-full bg-ink px-4 font-semibold text-paper">Ouvrir le prototype</Link>
                <Link href={`/design-review/${c.key}`} className="inline-flex min-h-11 items-center rounded-full border border-line px-4 hover:border-ink">Données réelles seules</Link>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-8 text-sm text-muted">
        Audit complet, matrice KALT / Rio District, notation et points à valider : <code>docs/design-review/README.md</code>.
      </p>
    </div>
  );
}
