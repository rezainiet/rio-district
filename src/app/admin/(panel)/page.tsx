import Link from "next/link";
import { connectDB } from "@/lib/db";
import { getSettings } from "@/lib/catalog";
import { formatEUR } from "@/lib/money";
import { formatDate } from "@/lib/labels";
import { checkoutPresentation } from "@/lib/payments/hosted";
import { Order, type OrderDoc } from "@/models/Order";
import { Product } from "@/models/Product";
import { ContactMessage } from "@/models/misc";
import { Badge, Card, Empty, PageHeader, Stat } from "@/components/admin/ui";

export const metadata = { title: "Tableau de bord" };

export default async function DashboardPage() {
  await connectDB();
  const [byStatus, paidAgg, openValue, recent, messages, activeProducts, settings] = await Promise.all([
    Order.aggregate<{ _id: string; n: number }>([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
    Order.aggregate<{ total: number; n: number }>([
      { $match: { paymentStatus: "paid", status: { $ne: "cancelled" } } },
      { $group: { _id: null, total: { $sum: "$totalCents" }, n: { $sum: 1 } } },
    ]),
    Order.aggregate<{ total: number }>([
      { $match: { status: { $in: ["pending_confirmation", "confirmed"] }, paymentStatus: { $ne: "paid" } } },
      { $group: { _id: null, total: { $sum: "$totalCents" } } },
    ]),
    Order.find().sort({ createdAt: -1 }).limit(8).lean<OrderDoc[]>(),
    ContactMessage.find({ status: "new" }).sort({ createdAt: -1 }).limit(5).lean(),
    Product.countDocuments({ status: "active" }),
    getSettings(),
  ]);

  const count = (s: string) => byStatus.find((b) => b._id === s)?.n ?? 0;
  const total = byStatus.reduce((a, b) => a + b.n, 0);
  const collected = paidAgg[0]?.total ?? 0;

  return (
    <>
      <PageHeader title="Tableau de bord" description="Vue d'ensemble des demandes de commande." />

      <div className="mb-6 flex flex-wrap gap-2 text-xs">
        <span className={`rounded-full px-3 py-1 font-semibold ${settings.orders.acceptingOrders ? "bg-emerald-100 text-emerald-900" : "bg-red-100 text-red-900"}`}>
          {settings.orders.acceptingOrders ? "Commandes ouvertes" : "Commandes fermées"}
        </span>
        <span className="rounded-full bg-stone-200 px-3 py-1 font-semibold text-stone-700">
          Paiement : {checkoutPresentation().mode === "request" ? "demande non payée" : checkoutPresentation().available ? "redirection configurée · rapprochement manuel" : "redirection indisponible · vérifier la configuration"}
        </span>
        <span className="rounded-full bg-stone-200 px-3 py-1 font-semibold text-stone-700">{activeProducts} produits en ligne</span>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Total" value={total} href="/admin/commandes" />
        <Stat label="À confirmer" value={count("pending_confirmation")} href="/admin/commandes?status=pending_confirmation" />
        <Stat label="Confirmées" value={count("confirmed")} href="/admin/commandes?status=confirmed" />
        <Stat label="Expédiées" value={count("fulfilled")} href="/admin/commandes?status=fulfilled" />
        <Stat label="Annulées" value={count("cancelled")} href="/admin/commandes?status=cancelled" />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Stat
          label="Montant encaissé"
          value={formatEUR(collected)}
          hint={`${paidAgg[0]?.n ?? 0} commande(s) marquée(s) payée(s). Les demandes non payées ne sont pas comptées.`}
        />
        <Stat
          label="Demandes ouvertes non payées"
          value={formatEUR(openValue[0]?.total ?? 0)}
          hint="Valeur indicative des demandes à confirmer ou confirmées — ce n'est pas du chiffre d'affaires."
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card title="Dernières demandes" className="lg:col-span-2" actions={<Link href="/admin/commandes" className="text-xs underline">Tout voir</Link>}>
          {recent.length === 0 ? (
            <Empty>Aucune demande pour l&apos;instant.</Empty>
          ) : (
            <ul className="-my-2 divide-y divide-line">
              {recent.map((o) => (
                <li key={String(o._id)}>
                  <Link href={`/admin/commandes/${o._id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 hover:bg-paper-2/50">
                    <span className="w-24 font-mono text-xs">{o.number}</span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{o.customer.fullName}</span>
                    <Badge value={o.status} kind="order" />
                    <Badge value={o.paymentStatus} kind="payment" />
                    <span className="price w-20 text-right text-sm">{formatEUR(o.totalCents)}</span>
                    <span className="w-full text-xs text-muted sm:w-auto">{formatDate(o.createdAt as Date)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Nouveaux messages" actions={<Link href="/admin/messages" className="text-xs underline">Tout voir</Link>}>
          {messages.length === 0 ? (
            <Empty>Aucun nouveau message.</Empty>
          ) : (
            <ul className="-my-2 divide-y divide-line">
              {messages.map((m) => (
                <li key={String(m._id)} className="py-3">
                  <p className="truncate text-sm font-medium">{m.email}</p>
                  <p className="line-clamp-2 text-xs text-muted">{m.message}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
