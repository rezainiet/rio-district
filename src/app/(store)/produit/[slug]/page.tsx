import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProductBySlug, getSettings } from "@/lib/catalog";
import { formatEUR } from "@/lib/money";
import { isSize } from "@/lib/sizes";
import { loadProductPage } from "@/lib/storefront";
import { ProductView } from "@/components/store/pdp/ProductView";
import { alternates } from "@/i18n/config";
import { localizeProduct } from "@/i18n/content";
import { getT } from "@/i18n/server";
import { shareDefaults } from "@/i18n/share";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function generateMetadata({ params }: PageProps<"/produit/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const [frProduct, settings, tr] = await Promise.all([getProductBySlug(slug), getSettings(), getT()]);
  const { t, href, locale } = tr;
  if (!frProduct) return { title: t("Produit introuvable") };
  const product = localizeProduct(frProduct, tr);
  const title = product.name;
  const description =
    product.description.slice(0, 160) || `${product.name} — ${formatEUR(product.priceCents)}`;
  const image = product.images[0]?.url;
  const productImage = image && !image.endsWith(".svg") ? image : null;
  return {
    title: `${title} — ${formatEUR(product.priceCents)}`,
    description,
    alternates: alternates(`/produit/${product.slug}`, locale),
    openGraph: {
      ...shareDefaults(tr, settings.storeName || "Rio District").openGraph,
      title,
      description,
      url: href(`/produit/${product.slug}`),
      ...(productImage ? { images: [{ url: productImage }] } : {}),
    },
  };
}

export default async function ProductPage({ params, searchParams }: PageProps<"/produit/[slug]">) {
  const { slug } = await params;
  const sp = await searchParams;
  const { locale, href } = await getT();
  const [d, settings] = await Promise.all([loadProductPage(slug, { locale }), getSettings()]);
  if (!d) notFound();
  const { product, summary } = d;

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
      url: new URL(href(`/produit/${product.slug}`), siteUrl).toString(),
      priceCurrency: "EUR",
      price: (product.priceCents / 100).toFixed(2),
      availability: anyAvailable ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
    // Only real, published reviews from this site's database feed the rating shown to search engines.
    ...(summary.count > 0 && d.reviewSource === "database" && {
      aggregateRating: { "@type": "AggregateRating", ratingValue: summary.average, reviewCount: summary.count, bestRating: 5, worstRating: 1 },
    }),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <ProductView key={product.id} d={d} initialOffer={offerParam === "pack" ? "bundle" : "single"} initialSize={initialSize} />
    </>
  );
}
