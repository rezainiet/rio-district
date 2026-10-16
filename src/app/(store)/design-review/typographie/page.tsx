import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { designReviewEnabled } from "@/lib/design-review";

export const metadata: Metadata = { title: "Typographie — comparaison", robots: { index: false, follow: false } };

/** Dev-only type specimen: the same storefront elements set in three display options (Manrope body everywhere). */
const OPTIONS = [
  { key: "a", name: "A · Syne 800 (actuel)", display: { fontFamily: "var(--font-syne)", fontWeight: 800, letterSpacing: "-0.01em" } },
  { key: "b", name: "B · Archivo condensé 800", display: { fontFamily: "var(--font-archivo)", fontWeight: 800, fontVariationSettings: "'wdth' 72", letterSpacing: "-0.005em" } },
  { key: "c", name: "C · Archivo standard 700", display: { fontFamily: "var(--font-archivo)", fontWeight: 700, fontVariationSettings: "'wdth' 100", letterSpacing: "-0.025em" } },
] as const;

export default function TypeSpecimen() {
  if (!designReviewEnabled()) notFound();
  return (
    <div className="container-x space-y-6 py-8">
      {OPTIONS.map((o) => (
        <section key={o.key} id={`option-${o.key}`} className="rounded-2xl border border-line p-4">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-brand">{o.name}</p>
          <h1 style={o.display} className="text-[40px] uppercase leading-[0.95]">La veste de la saison.</h1>
          <p className="mt-3 text-[16px] leading-relaxed text-ink-2">Coupe-vent léger, coupe ample, zip intégral. Du XS au 3XL.</p>
          <div className="mt-6 border-t border-line pt-5">
            <h2 style={o.display} className="text-[28px] uppercase leading-[1]">Veste Brésil Vert</h2>
            <p className="mt-2 text-sm text-ink-2">★★★★★ 4,9 · 28 avis clients</p>
            <p className="mt-3 flex items-baseline gap-3">
              <span style={{ ...o.display, fontVariantNumeric: "tabular-nums" }} className="text-[32px] leading-none">19,99 €</span>
              <span className="text-sm text-muted">ou 2 pour <span style={o.display} className="text-base text-ink">24,95 €</span></span>
            </p>
          </div>
          <div className="mt-6 border-t border-line pt-5">
            <h2 style={o.display} className="text-[30px] uppercase leading-[1]">Questions fréquentes.</h2>
            <p style={o.display} className="mt-4 text-[26px] uppercase leading-none">Pack 2 vestes</p>
          </div>
        </section>
      ))}
    </div>
  );
}
