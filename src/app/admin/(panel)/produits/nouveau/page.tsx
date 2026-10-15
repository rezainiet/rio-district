import Link from "next/link";
import { connectDB } from "@/lib/db";
import { SIZES } from "@/lib/sizes";
import { Category } from "@/models/Category";
import { PageHeader } from "@/components/admin/ui";
import { ProductForm, type ProductFormValue } from "@/components/admin/ProductForm";

export const metadata = { title: "Nouveau produit" };

export default async function NewProductPage() {
  await connectDB();
  const categories = await Category.find().sort({ sortOrder: 1 }).lean();
  const initial: ProductFormValue = {
    name: "",
    slug: "",
    group: "",
    categoryId: categories[0] ? String(categories[0]._id) : "",
    color: { name: "", hex: "#121212" },
    tagline: "",
    description: "",
    details: [],
    material: "",
    care: "",
    priceCents: 1999,
    compareAtCents: null,
    images: [],
    sizes: SIZES.map((label) => ({ label, enabled: true, stock: null })),
    status: "draft",
    bundleEligible: true,
    sortOrder: 100,
    seo: { title: "", description: "" },
  };
  return (
    <>
      <Link href="/admin/produits" className="text-sm text-muted hover:text-ink">← Produits</Link>
      <PageHeader title="Nouveau produit" description="Enregistré en brouillon tant que tu ne le passes pas « En ligne »." />
      <ProductForm initial={initial} categories={categories.map((c) => ({ id: String(c._id), name: c.name }))} />
    </>
  );
}
