import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getActiveProducts, getProductBySlug, getSettings } from "@/lib/catalog";
import { CONCEPTS, RETURNS_CONCEPT_PATH, conceptsEnabled, type ConceptKey } from "@/lib/concepts";
import { deliveryEstimate, deliveryRange } from "@/lib/delivery";
import { formatEUR } from "@/lib/money";
import { productFaq } from "@/lib/policies";
import { getProductReviews } from "@/lib/reviews";
import type { PublicProduct } from "@/lib/types";
import { Faq } from "@/components/store/Faq";
import { ProductCard } from "@/components/store/ProductCard";
import { Reviews } from "@/components/store/Reviews";
import { ConceptConfiance } from "@/components/concepts/ConceptConfiance";
import { ConceptPack } from "@/components/concepts/ConceptPack";
import { ConceptVitrine } from "@/components/concepts/ConceptVitrine";
import { TrustGrid, type ConceptData } from "@/components/concepts/blocks";

export const metadata: Metadata = { title: "Concept fiche produit", robots: { index: false, follow: false } };

/** ?stock=3 previews the low-stock state on untracked products (clearly tagged on the page). */
function simulateStock(p: PublicProduct, n: number): PublicProduct {
  return { ...p, sizes: p.sizes.map((s) => (s.available ? { ...s, remaining: n } : s)) };
}

export default async function ConceptProductPage({ params, searchParams }: PageProps<"/concepts/[concept]/[slug]">) {
  if (!conceptsEnabled()) notFound();
  const { concept, slug } = await params;
  const meta = CONCEPTS.find((c) => c.key === concept);
  if (!meta) notFound();
  const sp = await searchParams;
  const [found, settings, all] = await Promise.all([getProductBySlug(slug), getSettings(), getActiveProducts()]);
  if (!found) notFound();

  const stockParam = typeof sp.stock === "string" ? Number(sp.stock) : NaN;
  const simulated = Number.isInteger(stockParam) && stockParam >= 1 && stockParam <= 9;
  const fix = (p: PublicProduct) => (simulated ? simulateStock(p, stockParam) : p);
  const product = fix(found);
  const catalogue = all.map(fix);
  const siblings = product.group ? catalogue.filter((p) => p.group === product.group) : [product];
  const bundleOptions = catalogue.filter((p) => p.bundleEligible && (!product.group || p.group === product.group));
  const related = catalogue.filter((p) => p.id !== product.id).slice(0, 4);
  const { summary, reviews } = await getProductReviews(found, siblings);
  const top = reviews.find((r) => r.rating >= 4 && r.text.length >= 40) ?? reviews[0] ?? null;

  const d: ConceptData = {
    product,
    siblings,
    bundleOptions,
    related,
    summary,
    verifiedCount: reviews.filter((r) => r.verified).length,
    topReview: top ? { author: top.author, text: top.text, rating: top.rating, color: top.color } : null,
    delivery: {
      range: deliveryRange(settings.shipping.minDays, settings.shipping.maxDays),
      label: deliveryEstimate(settings.shipping.minDays, settings.shipping.maxDays),
      minDays: settings.shipping.minDays,
      maxDays: settings.shipping.maxDays,
      free: settings.shipping.priceCents === 0,
    },
    policy: settings.returnsPolicy,
    stockSimulated: simulated,
    basePath: `/concepts/${concept}`,
    returnsHref: RETURNS_CONCEPT_PATH,
  };
  const faq = productFaq(settings.returnsPolicy, {
    minDays: settings.shipping.minDays,
    maxDays: settings.shipping.maxDays,
    bundlePrice: formatEUR(settings.bundle.priceCents),
    bundleQty: settings.bundle.quantity,
  });
  const offre = typeof sp.offre === "string" && sp.offre === "pack" ? "bundle" : concept === "pack" ? "bundle" : "single";
  const props = { d, sizeRules: settings.sizeRules, sizeChart: settings.sizeChart, initialOffer: offre } as const;

  const reviewsBlock = <Reviews variant="product" summary={summary} reviews={reviews} product={{ id: product.id, name: product.name }} />;
  const relatedBlock = related.length > 0 && (
    <section aria-labelledby="related-title" className="border-t border-line py-16 lg:py-20">
      <div className="container-x">
        <p className="lab">{concept === "pack" ? "Les six coloris" : "Les autres coloris"}</p>
        <h2 id="related-title" className="display mt-3 text-[30px] uppercase sm:text-[44px]">Complète ton pack.</h2>
        <ul className="mt-8 grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
          {related.map((p) => (
            <li key={p.id}><ProductCard product={p} bundle={settings.bundle} /></li>
          ))}
        </ul>
      </div>
    </section>
  );
  const faqBlock = (
    <div className="container-x pb-20 pt-4 lg:pb-28">
      <Faq items={faq} id="faq-produit" />
    </div>
  );

  const sections: Record<ConceptKey, React.ReactNode> = {
    vitrine: (
      <>
        <ConceptVitrine {...props} />
        <TrustGrid d={d} />
        {reviewsBlock}
        {relatedBlock}
        {faqBlock}
      </>
    ),
    confiance: (
      <>
        <ConceptConfiance {...props} />
        {reviewsBlock}
        {faqBlock}
        {relatedBlock}
      </>
    ),
    pack: (
      <>
        <ConceptPack {...props} />
        {reviewsBlock}
        {relatedBlock}
        {faqBlock}
      </>
    ),
  };

  return (
    <>
      {/* Review banner: makes it obvious this is a design concept, not the live page. */}
      <div className="border-b border-line bg-paper-2">
        <div className="container-x flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-2.5 text-xs">
          <p className="text-ink-2">
            <span className="lab mr-2">Concept {meta.letter}</span>
            <span className="font-semibold text-ink">{meta.name}</span> — maquette de validation, non publiée
          </p>
          <nav aria-label="Concepts" className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto whitespace-nowrap px-4 sm:mx-0 sm:px-0">
            {CONCEPTS.map((c) => (
              <Link
                key={c.key}
                href={`/concepts/${c.key}/${slug}${simulated ? `?stock=${stockParam}` : ""}`}
                aria-current={c.key === concept ? "page" : undefined}
                className={`rounded-full px-3 py-1.5 ${c.key === concept ? "bg-ink text-paper" : "border border-line hover:border-ink"}`}
              >
                {c.letter} · {c.name}
              </Link>
            ))}
            <Link href={`/produit/${slug}`} className="rounded-full border border-line px-3 py-1.5 hover:border-ink">Page actuelle</Link>
          </nav>
        </div>
      </div>
      {sections[concept as ConceptKey]}
    </>
  );
}
