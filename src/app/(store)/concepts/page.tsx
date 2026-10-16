import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CONCEPTS, RETURNS_CONCEPT_PATH, conceptsEnabled } from "@/lib/concepts";

export const metadata: Metadata = { title: "Concepts fiche produit", robots: { index: false, follow: false } };

export default function ConceptsIndex() {
  if (!conceptsEnabled()) notFound();
  return (
    <div className="container-x py-12 md:py-20">
      <p className="lab">Validation client</p>
      <h1 className="display mt-3 text-[32px] uppercase sm:text-[56px]">Concepts fiche produit</h1>
      <p className="mt-4 max-w-2xl text-ink-2">
        Trois directions pour la fiche produit, avec les mêmes produits, photos et prix. Le stock est réel ; ajoute « ?stock=3 »
        pour prévisualiser l&apos;état « stock limité » (signalé comme aperçu sur la page).
      </p>
      <ul className="mt-10 grid gap-4 lg:grid-cols-3">
        {CONCEPTS.map((c) => (
          <li key={c.key} className="flex flex-col rounded-[18px] border border-line bg-paper-2 p-6">
            <p className="font-display text-4xl font-extrabold text-brand">{c.letter}</p>
            <h2 className="mt-3 font-display text-xl font-bold uppercase">{c.name}</h2>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-2">{c.intent}</p>
            <div className="mt-6 flex flex-wrap gap-2 text-sm">
              <Link href={`/concepts/${c.key}/veste-bresil-vert`} className="rounded-full bg-ink px-4 py-2.5 font-semibold text-paper">Voir le concept</Link>
              <Link href={`/concepts/${c.key}/veste-bresil-vert?stock=3`} className="rounded-full border border-line-strong px-4 py-2.5 hover:border-ink">Avec stock limité</Link>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-8 text-sm">
        <Link href={RETURNS_CONCEPT_PATH} className="underline underline-offset-4">Projet de page « Retours & remboursements »</Link>
      </p>
    </div>
  );
}
