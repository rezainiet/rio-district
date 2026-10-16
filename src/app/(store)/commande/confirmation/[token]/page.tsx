import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import { getSettings } from "@/lib/catalog";
import { formatEUR } from "@/lib/money";
import { COUNTRIES } from "@/lib/validation";
import { Order, type OrderDoc } from "@/models/Order";
import { ButtonLink } from "@/components/ui/Button";
import { CheckIcon } from "@/components/ui/icons";
import { ResumeCheckout } from "@/components/store/ResumeCheckout";

export const metadata: Metadata = { title: "Commande enregistrée", robots: { index: false, follow: false }, referrer: "no-referrer" };

const STATUS_LABEL: Record<string, string> = {
  pending_confirmation: "En attente de confirmation",
  confirmed: "Confirmée",
  fulfilled: "Expédiée",
  cancelled: "Annulée",
};

export default async function ConfirmationPage({ params }: PageProps<"/commande/confirmation/[token]">) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{20,40}$/.test(token)) notFound();
  await connectDB();
  const [order, settings] = await Promise.all([
    Order.findOne({ publicToken: token }).lean<OrderDoc>(),
    getSettings(),
  ]);
  if (!order) notFound();

  const country = COUNTRIES.find((c) => c.code === order.shipping.country)?.label ?? order.shipping.country;
  const paid = order.paymentStatus === "paid";
  const hosted = order.payment?.provider === "everflow";
  if (order.creationState === "preparing") notFound();
  const paymentLabel = paid ? "Paiement vérifié" : order.paymentStatus === "refunded" ? "Remboursement enregistré" : order.paymentStatus === "failed" ? "Échec enregistré" : hosted ? "En attente — paiement non vérifié" : "Non payée — aucun montant prélevé";

  return (
    <div className="container-x py-12 md:py-20">
      <div className="mx-auto max-w-3xl">
        <span className="grid size-14 place-items-center rounded-full bg-lime">
          <CheckIcon width={26} height={26} />
        </span>
        <p className="eyebrow mt-6 text-muted">Demande n° {order.number}</p>
        <h1 className="display mt-2 text-[30px] uppercase sm:text-[40px] md:text-[60px]">Merci, c&apos;est noté.</h1>
        <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-ink-2">
          {hosted ? <>Ta sélection est enregistrée. Cette page ne confirme aucun paiement. Si tu as déjà payé chez le partenaire, contacte la boutique avant de réessayer.</> : <>Ta demande de commande est bien enregistrée. Nous revenons vers toi à <strong>{order.customer.email}</strong> pour la confirmer et t&apos;indiquer comment régler.</>}
        </p>

        <dl className="mt-8 grid gap-px overflow-hidden rounded-[var(--radius-md)] border border-line bg-line sm:grid-cols-2">
          <div className="bg-paper-2 p-4">
            <dt className="eyebrow text-muted">Statut</dt>
            <dd className="mt-1 font-semibold">{STATUS_LABEL[order.status] ?? order.status}</dd>
          </div>
          <div className="bg-paper-2 p-4">
            <dt className="eyebrow text-muted">Paiement</dt>
            <dd className="mt-1 font-semibold">{paymentLabel}</dd>
          </div>
        </dl>
        {!paid && !hosted && <p className="mt-3 text-sm text-muted">{settings.orders.paymentNotice}</p>}
        {hosted && order.paymentStatus === "pending" && order.status !== "cancelled" && <div className="mt-5"><ResumeCheckout token={token} /></div>}

        <section aria-labelledby="recap-title" className="mt-12">
          <h2 id="recap-title" className="eyebrow text-muted">Récapitulatif</h2>
          <ul className="mt-3 divide-y divide-line border-y border-line">
            {order.lines.map((l, i) => (
              <li key={i} className="flex justify-between gap-4 py-4 text-sm">
                <div>
                  <p className="font-semibold">
                    {l.label} {l.quantity > 1 && <span className="text-muted">× {l.quantity}</span>}
                  </p>
                  <p className="text-muted">{l.items.map((it) => `${it.color} · ${it.size}`).join(" + ")}</p>
                </div>
                <p className="price">{formatEUR(l.totalCents)}</p>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-1.5 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Sous-total</dt><dd>{formatEUR(order.subtotalCents)}</dd></div>
            {order.discountCents > 0 && (
              <div className="flex justify-between text-brand"><dt>Remise pack</dt><dd>−{formatEUR(order.discountCents)}</dd></div>
            )}
            <div className="flex justify-between"><dt className="text-muted">Livraison</dt><dd>{order.shippingCents ? formatEUR(order.shippingCents) : "Offerte"}</dd></div>
            <div className="flex items-baseline justify-between border-t border-line pt-3">
              <dt className="eyebrow">Total à régler</dt>
              <dd className="price text-2xl">{formatEUR(order.totalCents)}</dd>
            </div>
          </dl>
        </section>

        <section aria-labelledby="ship-title" className="mt-10 grid gap-6 sm:grid-cols-2">
          <div>
            <h2 id="ship-title" className="eyebrow text-muted">Livraison</h2>
            <address className="mt-2 text-sm not-italic leading-relaxed">
              {order.customer.fullName}
              <br />
              {order.shipping.address}
              {order.shipping.address2 && (
                <>
                  <br />
                  {order.shipping.address2}
                </>
              )}
              <br />
              {order.shipping.postalCode} {order.shipping.city}
              <br />
              {country}
            </address>
          </div>
          <div>
            <h2 className="eyebrow text-muted">Et ensuite ?</h2>
            <ol className="mt-2 space-y-1.5 text-sm text-ink-2">
              <li>1. {hosted ? "La boutique rapproche ta commande avec une preuve de paiement vérifiée." : "Nous confirmons ta commande par e-mail."}</li>
              <li>2. {hosted ? "Un retour du partenaire ne constitue pas une confirmation de paiement." : "Tu règles selon les instructions reçues."}</li>
              <li>3. Expédition, puis {settings.shipping.summary.toLowerCase()}.</li>
            </ol>
          </div>
        </section>

        <div className="mt-12 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/">Retour à la boutique</ButtonLink>
          <ButtonLink href="/#contact" variant="outline">Une question ?</ButtonLink>
        </div>
        <p className="mt-6 text-xs text-muted">Conserve cette page : son lien te permet de retrouver ta demande.</p>
      </div>
    </div>
  );
}
