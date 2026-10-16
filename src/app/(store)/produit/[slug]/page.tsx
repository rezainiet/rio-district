import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getActiveProducts, getProductBySlug, getPublishedTestimonials, getSettings } from "@/lib/catalog";
import { deliveryEstimate, deliveryRange } from "@/lib/delivery";
import { formatEUR } from "@/lib/money";
import { isSize } from "@/lib/sizes";
import { Gallery } from "@/components/store/Gallery";
import { ProductPurchase } from "@/components/store/ProductPurchase";
import { ProductCard } from "@/components/store/ProductCard";
import { Faq } from "@/components/store/Faq";
import { Testimonials } from "@/components/store/Testimonials";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function generateMetadata({ params }: PageProps<"/produit/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Produit introuvable" };
  const title = product.name;
  const description =
    product.description.slice(0, 160) || `${product.name} — ${formatEUR(product.priceCents)}`;
  const image = product.images[0]?.url;
  return {
    title: `${title} — ${formatEUR(product.priceCents)}`,
    description,
    alternates: { canonical: `/produit/${product.slug}` },
    openGraph: {
      title,
      description,
      type: "website",
      url: `/produit/${product.slug}`,
      images: image && !image.endsWith(".svg") ? [{ url: image }] : undefined,
    },
  };
}

export default async function ProductPage({ params, searchParams }: PageProps<"/produit/[slug]">) {
  const { slug } = await params;
  const sp = await searchParams;
  const [product, settings, all, testimonials] = await Promise.all([
    getProductBySlug(slug),
    getSettings(),
    getActiveProducts(),
    getPublishedTestimonials(),
  ]);
  if (!product) notFound();

  const siblings = product.group ? all.filter((p) => p.group === product.group) : [product];
  const bundleOptions = all.filter((p) => p.bundleEligible && (!product.group || p.group === product.group));
  const related = all.filter((p) => p.id !== product.id).slice(0, 4);

  const offerParam = typeof sp.offre === "string" ? sp.offre : "";
  const sizeParam = typeof sp.taille === "string" ? sp.taille.toUpperCase() : "";
  const initialSize = isSize(sizeParam) && product.sizes.some((s) => s.label === sizeParam && s.available) ? sizeParam : null;

  const anyAvailable = product.sizes.some((s) => s.available);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    sku: product.slug,
    color: product.color.name,
    brand: { "@type": "Brand", name: settings.storeName },
    image: product.images.map((i) => new URL(i.url, siteUrl).toString()),
    offers: {
      "@type": "Offer",
      url: new URL(`/produit/${product.slug}`, siteUrl).toString(),
      priceCurrency: "EUR",
      price: (product.priceCents / 100).toFixed(2),
      availability: anyAvailable ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <nav aria-label="Fil d'Ariane" className="container-x pt-4 text-xs text-muted md:pt-6">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li><Link href="/" className="hover:text-ink">Accueil</Link></li>
          <li aria-hidden>/</li>
          <li><Link href="/#collection" className="hover:text-ink">Collection</Link></li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="text-ink">{product.name}</li>
        </ol>
      </nav>

      <section className="container-x grid gap-8 pb-16 pt-4 lg:grid-cols-12 md:gap-10 md:pb-24 md:pt-6 lg:gap-16">
        <div className="lg:col-span-7">
          <div className="md:mx-auto md:max-w-[560px] lg:sticky lg:top-24 lg:max-w-none">
            <Gallery key={product.id} images={product.images} name={product.name} />
          </div>
        </div>
        <div className="lg:col-span-5">
          <ProductPurchase
            key={product.id}
            product={product}
            siblings={siblings}
            bundleOptions={bundleOptions}
            initialOffer={offerParam === "pack" ? "bundle" : "single"}
            initialSize={initialSize}
            sizeRules={settings.sizeRules}
            sizeChart={settings.sizeChart}
            delivery={{
              label: deliveryEstimate(settings.shipping.minDays, settings.shipping.maxDays),
              range: deliveryRange(settings.shipping.minDays, settings.shipping.maxDays),
              summary: settings.shipping.summary,
              returns: settings.returns.summary,
            }}
          />

          <div className="faq mt-10 divide-y divide-line border-y border-line">
            <details open className="group">
              <summary className="flex min-h-14 list-none items-center justify-between py-4">
                <span className="eyebrow text-xs">Description</span>
                <span className="faq-icon text-xl transition-transform" aria-hidden>+</span>
              </summary>
              <div className="pb-5 text-[15px] leading-relaxed text-ink-2">
                <p>{product.description}</p>
              </div>
            </details>
            {product.details.length > 0 && (
              <details className="group">
                <summary className="flex min-h-14 list-none items-center justify-between py-4">
                  <span className="eyebrow text-xs">Détails</span>
                  <span className="faq-icon text-xl transition-transform" aria-hidden>+</span>
                </summary>
                <ul className="list-disc space-y-1 pb-5 pl-5 text-[15px] text-ink-2">
                  {product.details.map((d) => <li key={d}>{d}</li>)}
                  {product.material && <li>Composition : {product.material}</li>}
                  {product.care && <li>Entretien : {product.care}</li>}
                </ul>
              </details>
            )}
            <details className="group">
              <summary className="flex min-h-14 list-none items-center justify-between py-4">
                <span className="eyebrow text-xs">Livraison & retours</span>
                <span className="faq-icon text-xl transition-transform" aria-hidden>+</span>
              </summary>
              <div className="space-y-3 pb-5 text-[15px] leading-relaxed text-ink-2">
                <p>{settings.shipping.details}</p>
                <p>{settings.returns.details}</p>
              </div>
            </details>
          </div>
        </div>
      </section>

      <Testimonials items={testimonials} title="Ils l'ont adoptée." />

      {related.length > 0 && (
        <section aria-labelledby="related-title" className="border-t border-line py-20 md:py-24">
          <div className="container-x">
            <p className="lab">Les autres coloris</p>
            <h2 id="related-title" className="display mt-3 text-[32px] uppercase md:text-[48px]">Complète ton pack.</h2>
            <ul className="mt-10 grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
              {related.map((p) => (
                <li key={p.id}>
                  <ProductCard product={p} bundle={settings.bundle} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <div className="container-x pb-20 md:pb-28">
        <Faq items={settings.faq} id="faq-produit" />
      </div>
    </>
  );
}
