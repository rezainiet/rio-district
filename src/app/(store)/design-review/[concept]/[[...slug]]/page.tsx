import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSettings } from "@/lib/catalog";
import { isSize } from "@/lib/sizes";
import { DEFAULT_PREVIEW_SLUG, DESIGN_CONCEPTS, designReviewEnabled, loadPreview, type DesignConceptKey } from "@/lib/design-review";
import { Concept01 } from "@/components/design-review/Concept01";
import { Concept02 } from "@/components/design-review/Concept02";
import { Concept03 } from "@/components/design-review/Concept03";
import { ProposedAnnouncement } from "@/components/design-review/ProposedAnnouncement";

export const metadata: Metadata = { title: "Revue de design — fiche produit", robots: { index: false, follow: false } };

const VIEWS = { "product-01": Concept01, "product-02": Concept02, "product-03": Concept03 } satisfies Record<DesignConceptKey, unknown>;

/**
 * /design-review/product-0X[/slug] — product-page concept on real data.
 *   ?demo=1      labelled samples where production has nothing yet (campaign countdown, tracked stock)
 *   ?avis=aucun  preview of the "no review yet" state
 * 404 in production (see designReviewEnabled).
 */
export default async function DesignReviewProduct({ params, searchParams }: PageProps<"/design-review/[concept]/[[...slug]]">) {
  if (!designReviewEnabled()) notFound();
  const { concept, slug } = await params;
  const meta = DESIGN_CONCEPTS.find((c) => c.key === concept);
  if (!meta || (slug && slug.length > 1)) notFound();
  const sp = await searchParams;
  const demo = sp.demo === "1";
  const noReviews = sp.avis === "aucun";
  const productSlug = slug?.[0] ?? DEFAULT_PREVIEW_SLUG;
  const [d, settings] = await Promise.all([loadPreview(productSlug, { demo, noReviews }), getSettings()]);
  if (!d) notFound();

  const View = VIEWS[meta.key];
  const t = typeof sp.taille === "string" ? sp.taille.toUpperCase() : "";
  const initialSize = isSize(t) && d.product.sizes.some((s) => s.label === t && s.available) ? t : null;
  const basePath = `/design-review/${meta.key}`;
  const q = (o: { demo?: boolean }) => (o.demo ? "?demo=1" : "");

  return (
    <>
      {settings.announcement.enabled && <ProposedAnnouncement text={settings.announcement.text} windowDays={d.policy.windowDays} />}
      {/* Review banner: makes it obvious this is a concept, not the live page. */}
      <div className="border-b border-line bg-[#121110]">
        <div className="container-x flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-2.5 text-xs">
          <p className="text-ink-2">
            <span className="lab mr-2">Concept {meta.num}</span>
            <span className="font-semibold text-ink">{meta.name}</span> — maquette de validation, non publiée
          </p>
          <nav aria-label="Concepts" className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto whitespace-nowrap px-4 sm:mx-0 sm:px-0">
            {DESIGN_CONCEPTS.map((c) => (
              <Link
                key={c.key}
                href={`/design-review/${c.key}/${productSlug}${q({ demo })}`}
                aria-current={c.key === meta.key ? "page" : undefined}
                className={`inline-flex min-h-9 items-center rounded-full px-3 ${c.key === meta.key ? "bg-ink text-paper" : "border border-line hover:border-ink"}`}
              >
                {c.num} · {c.short}
              </Link>
            ))}
            <Link
              href={`${basePath}/${productSlug}${q({ demo: !demo })}`}
              className="inline-flex min-h-9 items-center rounded-full border border-dashed border-[#7d6a43] px-3 text-[#d9bf86] hover:border-[#d9bf86]"
            >
              {demo ? "Voir données réelles seules" : "Voir avec données d'aperçu"}
            </Link>
            <Link href="/design-review" className="inline-flex min-h-9 items-center rounded-full border border-line px-3 hover:border-ink">Comparer</Link>
          </nav>
        </div>
      </div>
      <View key={d.product.id} d={d} basePath={basePath} initialOffer={sp.offre === "pack" ? "bundle" : "single"} initialSize={initialSize} />
    </>
  );
}
