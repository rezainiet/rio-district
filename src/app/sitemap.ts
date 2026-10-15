import type { MetadataRoute } from "next";
import { getActiveProducts } from "@/lib/catalog";

export const dynamic = "force-dynamic";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getActiveProducts().catch(() => []);
  return [
    { url: `${siteUrl}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/livraison-retours`, changeFrequency: "yearly", priority: 0.3 },
    ...products.map((p) => ({ url: `${siteUrl}/produit/${p.slug}`, changeFrequency: "weekly" as const, priority: 0.8 })),
  ];
}
