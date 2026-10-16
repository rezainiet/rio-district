import Link from "next/link";
import type { QueryFilter } from "mongoose";
import { connectDB } from "@/lib/db";
import { formatParisDate, summarizeRatings } from "@/lib/marketing";
import { Product } from "@/models/Product";
import { Testimonial, reviewStatus, type TestimonialDoc } from "@/models/misc";
import { Card, Empty, PageHeader } from "@/components/admin/ui";
import { RowActions } from "@/components/admin/RowActions";
import { TestimonialForm } from "@/components/admin/TestimonialForm";

export const metadata = { title: "Avis" };

const FILTERS = {
  pending: { label: "En attente", query: { $or: [{ status: "pending" }, { status: { $exists: false }, published: false }] } },
  published: { label: "Publiés", query: { published: true } },
  hidden: { label: "Masqués", query: { status: "approved", published: false } },
  rejected: { label: "Rejetés", query: { status: "rejected" } },
  all: { label: "Tous", query: {} },
} satisfies Record<string, { label: string; query: QueryFilter<TestimonialDoc> }>;
type FilterKey = keyof typeof FILTERS;

const STATUS_BADGE: Record<string, [string, string]> = {
  published: ["Publié", "bg-emerald-100 text-emerald-900"],
  hidden: ["Masqué", "bg-stone-200 text-stone-700"],
  pending: ["En attente", "bg-amber-100 text-amber-900"],
  rejected: ["Rejeté", "bg-red-100 text-red-900"],
};

type ProductRow = { _id: unknown; name: string };

export default async function ReviewsPage({ searchParams }: PageProps<"/admin/avis">) {
  const sp = await searchParams;
  const filter: FilterKey = typeof sp.statut === "string" && sp.statut in FILTERS ? (sp.statut as FilterKey) : "pending";
  await connectDB();
  const keys = Object.keys(FILTERS) as FilterKey[];
  const [items, counts, publishedRatings, products] = await Promise.all([
    Testimonial.find(FILTERS[filter].query).sort({ createdAt: -1 }).limit(200).lean<TestimonialDoc[]>(),
    Promise.all(keys.map((k) => Testimonial.countDocuments(FILTERS[k].query))),
    Testimonial.find({ published: true }, { rating: 1 }).lean<{ rating?: number }[]>(),
    Product.find({}, { name: 1 }).sort({ sortOrder: 1 }).lean<ProductRow[]>(),
  ]);
  const count = Object.fromEntries(keys.map((k, i) => [k, counts[i]])) as Record<FilterKey, number>;
  const stats = summarizeRatings(publishedRatings.map((r) => r.rating ?? 5));
  const productName = new Map(products.map((p) => [String(p._id), p.name]));

  return (
    <>
      <PageHeader
        title="Avis clients"
        description="Les avis envoyés par les clients arrivent « en attente » et ne sont visibles qu'après approbation. Ne publie que des avis réels, avec l'accord de leurs auteurs."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-[var(--radius-md)] border border-line bg-white/70 p-4">
          <p className="eyebrow text-muted">Note moyenne publiée</p>
          <p className="price mt-2 text-4xl">{stats.count ? `${stats.average.toLocaleString("fr-FR")} / 5` : "—"}</p>
          <p className="mt-1 text-xs text-muted">Calculée sur les {stats.count} avis publiés uniquement.</p>
        </div>
        <div className="rounded-[var(--radius-md)] border border-line bg-white/70 p-4 lg:col-span-2">
          <p className="eyebrow text-muted">Répartition (publiés)</p>
          <dl className="mt-3 grid gap-1 text-xs">
            {([5, 4, 3, 2, 1] as const).map((n) => (
              <div key={n} className="grid grid-cols-[24px_1fr_28px] items-center gap-2">
                <dt>{n} ★</dt>
                <dd className="h-1.5 overflow-hidden rounded-full bg-stone-200">
                  <span className="block h-full bg-ink" style={{ width: stats.count ? `${(stats.distribution[n] / stats.count) * 100}%` : 0 }} />
                </dd>
                <dd className="text-right tabular-nums text-muted">{stats.distribution[n]}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="rounded-[var(--radius-md)] border border-line bg-white/70 p-4">
          <p className="eyebrow text-muted">À modérer</p>
          <p className="price mt-2 text-4xl">{count.pending}</p>
          <p className="mt-1 text-xs text-muted">{count.hidden} masqué(s) · {count.rejected} rejeté(s)</p>
        </div>
      </div>

      <nav aria-label="Filtrer les avis" className="no-scrollbar mb-4 flex gap-1 overflow-x-auto">
        {keys.map((k) => (
          <Link
            key={k}
            href={`/admin/avis?statut=${k}`}
            aria-current={k === filter ? "page" : undefined}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm ${k === filter ? "bg-ink text-paper" : "border border-line hover:border-ink"}`}
          >
            {FILTERS[k].label} <span className="tabular-nums opacity-60">{count[k]}</span>
          </Link>
        ))}
      </nav>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {items.length === 0 ? (
            <Empty>Aucun avis dans cette catégorie.</Empty>
          ) : (
            <ul className="space-y-3">
              {items.map((t) => (
                <ReviewRow key={String(t._id)} t={t} productName={productName} />
              ))}
            </ul>
          )}
        </div>
        <Card title="Ajouter un avis reçu">
          <TestimonialForm products={products.map((p) => ({ id: String(p._id), name: p.name }))} />
        </Card>
      </div>
    </>
  );
}

function ReviewRow({ t, productName }: { t: TestimonialDoc; productName: Map<string, string> }) {
  const st = reviewStatus(t);
  const key = t.published ? "published" : st === "approved" ? "hidden" : st;
  const [label, tone] = STATUS_BADGE[key];
  const id = String(t._id);
  const rating = t.rating ?? 5;
  const actions = [
    ...(!t.published && st !== "rejected" ? [{ label: "Approuver et publier", body: { action: "publish" } }] : []),
    ...(t.published ? [{ label: "Masquer", body: { action: "hide" } }] : []),
    ...(st === "rejected" ? [{ label: "Remettre en attente", body: { action: "pending" } }] : []),
    ...(st !== "rejected" ? [{ label: "Rejeter", body: { action: "reject" }, confirm: "Rejeter cet avis ? Il ne sera jamais affiché." }] : []),
    t.verified
      ? { label: "Retirer « Achat vérifié »", body: { verified: false } }
      : { label: "Marquer achat vérifié", body: { verified: true }, confirm: "Ne marque un avis vérifié que si la commande est confirmée. Continuer ?" },
    { label: "Supprimer", method: "DELETE" as const, confirm: "Supprimer définitivement cet avis ?", danger: true },
  ];
  return (
    <li className="rounded-[var(--radius-md)] border border-line bg-white/70 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm tracking-[0.1em] text-amber-700" role="img" aria-label={`${rating} sur 5`}>
          {"★".repeat(rating)}
          <span className="text-stone-300">{"★".repeat(5 - rating)}</span>
        </span>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone}`}>{label}</span>
        {t.verified && <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-900">Achat vérifié</span>}
        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] text-stone-700">
          {t.submittedBy === "customer" ? "Envoyé par un client" : t.submittedBy === "import" ? "Importé (boutique de référence)" : "Saisi par l'admin"}
        </span>
        <span className="ml-auto text-xs text-muted">
          {t.reviewedAt ? `Écrit le ${formatParisDate(t.reviewedAt)}` : t.submittedBy === "customer" ? formatParisDate(t.createdAt) : "Date d'origine inconnue"}
        </span>
      </div>
      {t.title && <p className="mt-3 font-semibold">{t.title}</p>}
      <p className="mt-1 whitespace-pre-line break-words text-sm text-ink-2">{t.text}</p>
      {(t.photos?.length ?? 0) > 0 && (
        <ul className="mt-3 flex gap-2">
          {t.photos.map((src) => (
            <li key={src}>
              <a href={src} target="_blank" rel="noreferrer" className="block size-20 overflow-hidden rounded-lg border border-line">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="Photo jointe à l'avis" className="size-full object-cover" />
              </a>
            </li>
          ))}
        </ul>
      )}
      <dl className="mt-3 grid gap-x-4 gap-y-0.5 text-xs text-muted sm:grid-cols-2">
        <div><dt className="inline">Auteur : </dt><dd className="inline text-ink">{t.author}</dd></div>
        {t.email && <div><dt className="inline">E-mail (privé) : </dt><dd className="inline">{t.email}</dd></div>}
        <div><dt className="inline">Produit : </dt><dd className="inline">{t.product ? productName.get(String(t.product)) ?? "—" : t.group ? "Veste Brésil (tous coloris)" : "Boutique (général)"}</dd></div>
        {t.orderNumber && (
          <div>
            <dt className="inline">Commande : </dt>
            <dd className="inline">{t.order ? <Link className="underline" href={`/admin/commandes/${t.order}`}>{t.orderNumber}</Link> : t.orderNumber}</dd>
          </div>
        )}
        {t.source && <div className="sm:col-span-2"><dt className="inline">Source : </dt><dd className="inline">{t.source}</dd></div>}
        {t.provenance?.url && (
          <div className="sm:col-span-2">
            <dt className="inline">Provenance : </dt>
            <dd className="inline">
              {t.provenance.url}
              {t.provenance.capturedAt ? `, relevé le ${formatParisDate(t.provenance.capturedAt)}` : ""}
              {t.provenance.originalPhoto ? ` · photo d'origine : ${t.provenance.originalPhoto}` : ""}
            </dd>
          </div>
        )}
        {t.moderatedBy && (
          <div className="sm:col-span-2">
            <dt className="inline">Modéré par : </dt>
            <dd className="inline">{t.moderatedBy}{t.moderatedAt ? `, le ${formatParisDate(t.moderatedAt)}` : ""}</dd>
          </div>
        )}
      </dl>
      <div className="mt-3">
        <RowActions endpoint={`/api/admin/testimonials/${id}`} actions={actions} />
      </div>
    </li>
  );
}
