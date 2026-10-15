import Link from "next/link";
import { connectDB } from "@/lib/db";
import { formatEUR } from "@/lib/money";
import { formatDate, ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL } from "@/lib/labels";
import { buildOrderQuery, readFilters } from "@/lib/order-query";
import { Order, ORDER_STATUSES, PAYMENT_STATUSES, type OrderDoc } from "@/models/Order";
import { Badge, Empty, PageHeader, inputCls } from "@/components/admin/ui";
import { buttonClass } from "@/components/ui/Button";

export const metadata = { title: "Commandes" };
const PAGE_SIZE = 25;

export default async function OrdersPage({ searchParams }: PageProps<"/admin/commandes">) {
  const sp = await searchParams;
  const filters = readFilters(sp);
  const page = Math.max(1, Number(typeof sp.page === "string" ? sp.page : 1) || 1);
  await connectDB();
  const query = buildOrderQuery(filters);
  const [orders, total] = await Promise.all([
    Order.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean<OrderDoc[]>(),
    Order.countDocuments(query),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const qs = (patch: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    const merged = { ...filters, page, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v !== undefined && v !== "" && !(k === "page" && v === 1)) p.set(k, String(v));
    const s = p.toString();
    return s ? `?${s}` : "";
  };
  const exportQs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v) as [string, string][]).toString();

  return (
    <>
      <PageHeader
        title="Commandes"
        description={`${total} demande${total > 1 ? "s" : ""}${Object.values(filters).some(Boolean) ? " (filtrées)" : ""}`}
        actions={
          <a href={`/api/admin/orders/export${exportQs ? `?${exportQs}` : ""}`} className={buttonClass("outline", "sm")}>
            Exporter CSV
          </a>
        }
      />

      <form className="mb-5 grid gap-2 rounded-[var(--radius-md)] border border-line bg-white/70 p-3 sm:grid-cols-2 lg:grid-cols-[1fr_180px_200px_140px_140px_auto]" role="search">
        <label className="sr-only" htmlFor="q">Rechercher</label>
        <input id="q" name="q" defaultValue={filters.q} placeholder="N°, nom, e-mail, téléphone, ville…" className={inputCls} />
        <label className="sr-only" htmlFor="status">Statut</label>
        <select id="status" name="status" defaultValue={filters.status ?? ""} className={inputCls}>
          <option value="">Tous les statuts</option>
          {ORDER_STATUSES.map((s) => <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>)}
        </select>
        <label className="sr-only" htmlFor="payment">Paiement</label>
        <select id="payment" name="payment" defaultValue={filters.payment ?? ""} className={inputCls}>
          <option value="">Tous les paiements</option>
          {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{PAYMENT_STATUS_LABEL[s]}</option>)}
        </select>
        <label className="sr-only" htmlFor="from">Du</label>
        <input id="from" type="date" name="from" defaultValue={filters.from} className={inputCls} aria-label="Du" />
        <label className="sr-only" htmlFor="to">Au</label>
        <input id="to" type="date" name="to" defaultValue={filters.to} className={inputCls} aria-label="Au" />
        <div className="flex gap-2">
          <button className={buttonClass("primary", "sm", "h-10 flex-1")}>Filtrer</button>
          <Link href="/admin/commandes" className={buttonClass("ghost", "sm", "h-10")}>Effacer</Link>
        </div>
      </form>

      {orders.length === 0 ? (
        <Empty>Aucune commande ne correspond.</Empty>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-md)] border border-line bg-white/70">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-line bg-paper-2/60 text-xs text-muted">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-medium">N°</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Date</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Client</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Articles</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Statut</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Paiement</th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {orders.map((o) => (
                <tr key={String(o._id)} className="relative hover:bg-paper-2/50">
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">
                    <Link href={`/admin/commandes/${o._id}`} className="after:absolute after:inset-0 hover:underline">
                      {o.number}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-muted">{formatDate(o.createdAt as Date)}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{o.customer.fullName}</p>
                    <p className="text-xs text-muted">{o.customer.email}</p>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {o.lines.map((l, i) => (
                      <p key={i}>
                        {l.kind === "bundle" ? "Pack · " : ""}
                        {l.items.map((it) => `${it.color} ${it.size}`).join(" + ")}
                        {l.quantity > 1 ? ` ×${l.quantity}` : ""}
                      </p>
                    ))}
                  </td>
                  <td className="px-4 py-3"><Badge value={o.status} kind="order" /></td>
                  <td className="px-4 py-3"><Badge value={o.paymentStatus} kind="payment" /></td>
                  <td className="price px-4 py-3 text-right">{formatEUR(o.totalCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <nav aria-label="Pagination" className="mt-4 flex items-center justify-between text-sm">
          {page > 1 ? <Link className="underline" href={`/admin/commandes${qs({ page: page - 1 })}`}>← Précédent</Link> : <span />}
          <span className="text-muted">Page {page} / {pages}</span>
          {page < pages ? <Link className="underline" href={`/admin/commandes${qs({ page: page + 1 })}`}>Suivant →</Link> : <span />}
        </nav>
      )}
    </>
  );
}
