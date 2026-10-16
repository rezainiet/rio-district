import Link from "next/link";
import { notFound } from "next/navigation";
import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/db";
import { formatEUR } from "@/lib/money";
import { formatDate, ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL } from "@/lib/labels";
import { allowedNextStatuses } from "@/lib/orders";
import { COUNTRIES } from "@/lib/validation";
import { Order, type OrderDoc, type OrderStatus } from "@/models/Order";
import { Badge, Card, PageHeader } from "@/components/admin/ui";
import { OrderActions } from "@/components/admin/OrderActions";
import { PaymentAttempt } from "@/models/misc";

export const metadata = { title: "Commande" };

const HISTORY_LABEL: Record<string, string> = {
  created: "Demande créée",
  status: "Statut modifié",
  payment: "Paiement modifié",
  note: "Note ajoutée",
  cancelled: "Commande annulée",
  checkout: "Redirection préparée (non vérifiée)",
};

export default async function OrderDetailPage({ params }: PageProps<"/admin/commandes/[id]">) {
  const { id } = await params;
  if (!isValidObjectId(id)) notFound();
  await connectDB();
  const order = await Order.findById(id).lean<OrderDoc>();
  if (!order) notFound();
  const attempt = await PaymentAttempt.findOne({ order: order._id, provider: "everflow", kind: "redirect" }).lean();

  const country = COUNTRIES.find((c) => c.code === order.shipping.country)?.label ?? order.shipping.country;
  const label = (map: Record<string, string>, v?: string | null) => (v ? map[v] ?? v : "—");

  return (
    <>
      <Link href="/admin/commandes" className="text-sm text-muted hover:text-ink">← Commandes</Link>
      <PageHeader
        title={order.number}
        description={<>Reçue le {formatDate(order.createdAt as Date)} · {order.itemsCount} article{order.itemsCount > 1 ? "s" : ""}</>}
        actions={
          <>
            <Badge value={order.status} kind="order" />
            <Badge value={order.paymentStatus} kind="payment" />
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Articles">
            <ul className="-my-2 divide-y divide-line">
              {order.lines.map((l, i) => (
                <li key={i} className="py-3">
                  <div className="flex justify-between gap-3">
                    <p className="font-semibold">
                      {l.label} {l.quantity > 1 && <span className="text-muted">× {l.quantity}</span>}
                    </p>
                    <p className="price">{formatEUR(l.totalCents)}</p>
                  </div>
                  <ul className="mt-1 space-y-0.5 text-sm">
                    {l.items.map((it, j) => (
                      <li key={j} className="flex items-center gap-2">
                        <span className="text-muted">•</span>
                        <Link href={`/admin/produits/${it.product}`} className="hover:underline">{it.name}</Link>
                        <span className="rounded bg-ink px-1.5 text-[11px] font-bold text-paper">{it.size}</span>
                        <span className="text-xs text-muted">({formatEUR(it.unitPriceCents ?? 0)})</span>
                      </li>
                    ))}
                  </ul>
                  {l.kind === "bundle" && l.compareAtCents > l.unitPriceCents && (
                    <p className="mt-1 text-xs text-brand">Pack : {formatEUR(l.compareAtCents)} → {formatEUR(l.unitPriceCents)} par pack</p>
                  )}
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-1 border-t border-line pt-4 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Sous-total</dt><dd>{formatEUR(order.subtotalCents)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Remise</dt><dd>−{formatEUR(order.discountCents)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Livraison</dt><dd>{formatEUR(order.shippingCents)}</dd></div>
              <div className="flex justify-between text-base font-semibold"><dt>Total</dt><dd className="price">{formatEUR(order.totalCents)}</dd></div>
            </dl>
          </Card>

          <div className="grid gap-6 sm:grid-cols-2">
            <Card title="Client">
              <p className="font-semibold">{order.customer.fullName}</p>
              <p className="mt-1 text-sm"><a className="underline" href={`mailto:${order.customer.email}?subject=${encodeURIComponent(`Commande ${order.number}`)}`}>{order.customer.email}</a></p>
              <p className="text-sm"><a className="underline" href={`tel:${order.customer.phone.replace(/\s/g, "")}`}>{order.customer.phone}</a></p>
            </Card>
            <Card title="Livraison">
              <address className="text-sm not-italic leading-relaxed">
                {order.customer.fullName}<br />
                {order.shipping.address}<br />
                {order.shipping.address2 && <>{order.shipping.address2}<br /></>}
                {order.shipping.postalCode} {order.shipping.city}<br />
                {country}
              </address>
            </Card>
          </div>

          {order.customerNote && (
            <Card title="Note du client">
              <p className="whitespace-pre-wrap text-sm">{order.customerNote}</p>
            </Card>
          )}

          <Card title="Historique">
            <ol className="relative space-y-4 border-l border-line pl-5">
              {[...order.history].reverse().map((h, i) => (
                <li key={i} className="relative">
                  <span className="absolute -left-[25px] top-1.5 size-2.5 rounded-full bg-ink ring-4 ring-paper" aria-hidden />
                  <p className="text-sm font-medium">
                    {HISTORY_LABEL[h.type] ?? h.type}
                    {h.type === "status" || h.type === "cancelled" ? ` : ${label(ORDER_STATUS_LABEL, h.from)} → ${label(ORDER_STATUS_LABEL, h.to)}` : ""}
                    {h.type === "payment" ? ` : ${label(PAYMENT_STATUS_LABEL, h.from)} → ${label(PAYMENT_STATUS_LABEL, h.to)}` : ""}
                  </p>
                  {h.message && <p className="text-sm text-ink-2">{h.message}</p>}
                  <p className="text-xs text-muted">{formatDate(h.at as Date)} · {h.by}</p>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-6">
          {order.payment?.provider === "everflow" && <Card title="Checkout Everflow"><dl className="space-y-2 text-sm"><div><dt className="text-muted">Mode</dt><dd>{attempt?.mode === "mock" ? "Simulation locale — aucun paiement réel" : "Redirection externe"}</dd></div><div><dt className="text-muted">État de la tentative</dt><dd>{attempt ? `${attempt.status} · ${attempt.redirectCount} redirection(s) préparée(s)` : "À reprendre"}</dd></div><div><dt className="text-muted">Référence interne de rapprochement</dt><dd className="break-all">{attempt?.providerRef ?? "Non créée"}</dd></div><div><dt className="text-muted">Corrélation transmise au partenaire</dt><dd>{attempt?.correlationSent ? "Oui (sub1 approuvé)" : "Non — rapprochement à confirmer"}</dd></div></dl><p className="mt-4 text-xs text-muted">Préparer un lien ne prouve ni l’arrivée chez le partenaire ni un paiement. Vérifie la transaction, le montant et la commande avant toute modification manuelle.</p></Card>}
          <OrderActions
            hosted={order.payment?.provider === "everflow"}
            id={String(order._id)}
            status={order.status as OrderStatus}
            next={allowedNextStatuses(order.status as OrderStatus)}
            paymentStatus={order.paymentStatus}
            notes={order.internalNotes.map((n) => ({
              id: String(n._id),
              text: n.text,
              author: n.author ?? "",
              at: formatDate(n.at as Date),
            }))}
          />
        </div>
      </div>
    </>
  );
}
