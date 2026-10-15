import { connectDB } from "@/lib/db";
import { Testimonial } from "@/models/misc";
import { Card, Empty, PageHeader } from "@/components/admin/ui";
import { RowActions } from "@/components/admin/RowActions";
import { TestimonialForm } from "@/components/admin/TestimonialForm";

export const metadata = { title: "Avis" };

export default async function ReviewsPage() {
  await connectDB();
  const items = await Testimonial.find().sort({ sortOrder: 1, createdAt: -1 }).lean();

  return (
    <>
      <PageHeader
        title="Avis clients"
        description="Seuls les avis publiés apparaissent sur la boutique. Ne publie que des avis réels, avec l'accord de leurs auteurs."
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {items.length === 0 ? (
            <Empty>Aucun avis.</Empty>
          ) : (
            <ul className="space-y-3">
              {items.map((t) => (
                <li key={String(t._id)} className="rounded-[var(--radius-md)] border border-line bg-white/70 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{t.author}</p>
                    <span className="text-xs">{"★".repeat(t.rating ?? 5)}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${t.published ? "bg-emerald-100 text-emerald-900" : "bg-stone-200 text-stone-700"}`}>
                      {t.published ? "Publié" : "Non publié"}
                    </span>
                    {t.verified && <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-900">Achat vérifié</span>}
                  </div>
                  <p className="mt-2 text-sm text-ink-2">“{t.text}”</p>
                  {t.source && <p className="mt-1 text-xs text-muted">Source : {t.source}</p>}
                  <div className="mt-3">
                    <RowActions
                      endpoint={`/api/admin/testimonials/${t._id}`}
                      actions={[
                        { label: t.published ? "Dépublier" : "Publier", body: { published: !t.published } },
                        { label: t.verified ? "Retirer « vérifié »" : "Marquer achat vérifié", body: { verified: !t.verified } },
                        { label: "Supprimer", method: "DELETE", confirm: "Supprimer cet avis ?", danger: true },
                      ]}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Card title="Ajouter un avis">
          <TestimonialForm />
        </Card>
      </div>
    </>
  );
}
