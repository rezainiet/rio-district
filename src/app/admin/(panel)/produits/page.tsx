import Image from "next/image";
import Link from "next/link";
import { connectDB } from "@/lib/db";
import { formatEUR } from "@/lib/money";
import { Product, type ProductDoc } from "@/models/Product";
import { Badge, Empty, PageHeader } from "@/components/admin/ui";
import { ButtonLink } from "@/components/ui/Button";

export const metadata = { title: "Produits" };

export default async function ProductsPage({ searchParams }: PageProps<"/admin/produits">) {
  const sp = await searchParams;
  const showArchived = sp.archives === "1";
  await connectDB();
  const products = await Product.find(showArchived ? {} : { status: { $ne: "archived" } })
    .sort({ sortOrder: 1, createdAt: 1 })
    .lean<ProductDoc[]>();

  return (
    <>
      <PageHeader
        title="Produits"
        description={`${products.length} produit${products.length > 1 ? "s" : ""}`}
        actions={
          <>
            <ButtonLink href={showArchived ? "/admin/produits" : "/admin/produits?archives=1"} variant="ghost" size="sm">
              {showArchived ? "Masquer les archivés" : "Voir les archivés"}
            </ButtonLink>
            <ButtonLink href="/admin/produits/nouveau" size="sm">+ Nouveau produit</ButtonLink>
          </>
        }
      />
      {products.length === 0 ? (
        <Empty>Aucun produit. Crée le premier.</Empty>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-md)] border border-line bg-white/70">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-line bg-paper-2/60 text-xs text-muted">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-medium">Produit</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Statut</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Prix</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Tailles / stock</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Pack</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {products.map((p) => {
                const tracked = p.sizes.filter((s) => typeof s.stock === "number");
                const stockTotal = tracked.reduce((a, s) => a + (s.stock ?? 0), 0);
                return (
                  <tr key={String(p._id)} className="relative hover:bg-paper-2/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative h-14 w-11 shrink-0 overflow-hidden rounded-[var(--radius-xs)] bg-studio">
                          {p.images[0] && <Image src={p.images[0].url} alt="" fill sizes="44px" className="object-cover" />}
                        </div>
                        <div>
                          <Link href={`/admin/produits/${p._id}`} className="font-semibold after:absolute after:inset-0 hover:underline">
                            {p.name}
                          </Link>
                          <p className="flex items-center gap-1.5 text-xs text-muted">
                            <span className="size-2.5 rounded-full ring-1 ring-black/15" style={{ background: p.color?.hex ?? "#000" }} />
                            {p.slug}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><Badge value={p.status} kind="product" /></td>
                    <td className="price px-4 py-3">{formatEUR(p.priceCents)}</td>
                    <td className="px-4 py-3 text-xs">
                      {p.sizes.filter((s) => s.enabled).map((s) => s.label).join(" · ") || "—"}
                      <p className="text-muted">{tracked.length ? `${stockTotal} en stock (suivi)` : "Stock non suivi"}</p>
                    </td>
                    <td className="px-4 py-3 text-xs">{p.bundleEligible ? "Oui" : "Non"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
