import Link from "next/link";
import { notFound } from "next/navigation";
import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/db";
import { SIZES, type Size } from "@/lib/sizes";
import { Category } from "@/models/Category";
import { Product, type ProductDoc } from "@/models/Product";
import { Order } from "@/models/Order";
import { Badge, PageHeader } from "@/components/admin/ui";
import { ProductForm, type ProductFormValue } from "@/components/admin/ProductForm";

export const metadata = { title: "Modifier le produit" };

export default async function EditProductPage({ params }: PageProps<"/admin/produits/[id]">) {
  const { id } = await params;
  if (!isValidObjectId(id)) notFound();
  await connectDB();
  const [p, categories, orderCount] = await Promise.all([
    Product.findById(id).lean<ProductDoc>(),
    Category.find().sort({ sortOrder: 1 }).lean(),
    Order.countDocuments({ "lines.items.product": id }),
  ]);
  if (!p) notFound();

  // Always present every size, so new sizes can be enabled later.
  const sizes = SIZES.map((label) => {
    const s = p.sizes.find((x) => x.label === label);
    return { label: label as Size, enabled: s ? Boolean(s.enabled) : false, stock: typeof s?.stock === "number" ? s.stock : null };
  });

  const initial: ProductFormValue = {
    id: String(p._id),
    name: p.name,
    slug: p.slug,
    group: p.group ?? "",
    categoryId: p.category ? String(p.category) : "",
    color: { name: p.color?.name ?? "", hex: p.color?.hex ?? "#121212" },
    tagline: p.tagline ?? "",
    description: p.description ?? "",
    details: p.details ?? [],
    material: p.material ?? "",
    care: p.care ?? "",
    priceCents: p.priceCents,
    compareAtCents: p.compareAtCents ?? null,
    images: p.images.map((i) => ({ url: i.url, alt: i.alt ?? "", kind: (i.kind ?? "photo") as "photo" | "placeholder" })),
    sizes,
    status: p.status as ProductFormValue["status"],
    bundleEligible: Boolean(p.bundleEligible),
    sortOrder: p.sortOrder ?? 0,
    seo: { title: p.seo?.title ?? "", description: p.seo?.description ?? "" },
  };

  return (
    <>
      <Link href="/admin/produits" className="text-sm text-muted hover:text-ink">← Produits</Link>
      <PageHeader
        title={p.name}
        description={
          <>
            {orderCount} commande{orderCount > 1 ? "s" : ""} liée{orderCount > 1 ? "s" : ""} ·{" "}
            {p.status === "active" ? (
              <a className="underline" href={`/produit/${p.slug}`} target="_blank" rel="noreferrer">Voir sur la boutique ↗</a>
            ) : (
              "non visible sur la boutique"
            )}
          </>
        }
        actions={<Badge value={p.status} kind="product" />}
      />
      <ProductForm
        initial={initial}
        categories={categories.map((c) => ({ id: String(c._id), name: c.name }))}
        canDelete={orderCount === 0}
      />
    </>
  );
}
