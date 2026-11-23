import type { MetadataRoute } from "next";
import { getActiveProducts } from "@/lib/catalog";
import { localizePath } from "@/i18n/config";

export const dynamic = "force-dynamic";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** Each page once per language, with its counterpart declared as an alternate. */
function entry(path: string, changeFrequency: "weekly" | "yearly", priority: number): MetadataRoute.Sitemap {
  const fr = `${siteUrl}${localizePath(path, "fr")}`;
  const es = `${siteUrl}${localizePath(path, "es")}`;
  const languages = { fr, es };
  return [
    { url: fr, changeFrequency, priority, alternates: { languages } },
    { url: es, changeFrequency, priority, alternates: { languages } },
  ];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getActiveProducts().catch(() => []);
  return [
    ...entry("/", "weekly", 1),
    ...entry("/livraison-retours", "yearly", 0.3),
    ...entry("/retours-remboursements", "yearly", 0.3),
    ...products.flatMap((p) => entry(`/produit/${p.slug}`, "weekly", 0.8)),
  ];
}
