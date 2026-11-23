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
import { getT } from "@/i18n/server";
import { localizeSettings } from "@/i18n/content";
import type { Translator } from "@/i18n/translate";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Commande enregistrée"), robots: { index: false, follow: false }, referrer: "no-referrer" };
}

function statusLabel(status: string, t: Translator["t"]) {
  const labels: Record<string, string> = {
    pending_confirmation: t("En attente de confirmation"),
    confirmed: t("Confirmée"),
    fulfilled: t("Expédiée"),
    cancelled: t("Annulée"),
  };
  return labels[status] ?? status;
}

export default async function ConfirmationPage({ params }: PageProps<"/commande/confirmation/[token]">) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{20,40}$/.test(token)) notFound();
  await connectDB();
  const [order, frSettings, tr] = await Promise.all([
    Order.findOne({ publicToken: token }).lean<OrderDoc>(),
    getSettings(),
    getT(),
  ]);
  if (!order) notFound();
  const { t, tx, href } = tr;
  const settings = localizeSettings(frSettings, tr);

  const country = tx(COUNTRIES.find((c) => c.code === order.shipping.country)?.label ?? order.shipping.country);
  const paid = order.paymentStatus === "paid";
  const hosted = order.payment?.provider === "everflow";
  if (order.creationState === "preparing") notFound();
  const paymentLabel = paid ? t("Paiement vérifié") : order.paymentStatus === "refunded" ? t("Remboursement enregistré") : order.paymentStatus === "failed" ? t("Échec enregistré") : hosted ? t("En attente — paiement non vérifié") : t("Non payée — aucun montant prélevé");
  // The e-mail address is emphasised inside the sentence.
  const [beforeEmail, afterEmail = ""] = t("Ta demande de commande est bien enregistrée. Nous revenons vers toi à {email} pour la confirmer et t'indiquer comment régler.").split("{email}");

  return (
    <div className="container-x py-12 md:py-20">
      <div className="mx-auto max-w-3xl">
        <span className="grid size-14 place-items-center rounded-full bg-lime">
          <CheckIcon width={26} height={26} />
        </span>
        <p className="eyebrow mt-6 text-muted">{t("Demande n° {number}", { number: order.number })}</p>
        <h1 className="display mt-2 text-[30px] uppercase sm:text-[40px] md:text-[60px]">{t("Merci, c'est noté.")}</h1>
        <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-ink-2">
          {hosted ? t("Ta sélection est enregistrée. Cette page ne confirme aucun paiement. Si tu as déjà payé chez le partenaire, contacte la boutique avant de réessayer.") : <>{beforeEmail}<strong>{order.customer.email}</strong>{afterEmail}</>}
        </p>

        <dl className="mt-8 grid gap-px overflow-hidden rounded-[var(--radius-md)] border border-line bg-line sm:grid-cols-2">
          <div className="bg-paper-2 p-4">
            <dt className="eyebrow text-muted">{t("Statut")}</dt>
            <dd className="mt-1 font-semibold">{statusLabel(order.status, t)}</dd>
          </div>
          <div className="bg-paper-2 p-4">
            <dt className="eyebrow text-muted">{t("Paiement")}</dt>
            <dd className="mt-1 font-semibold">{paymentLabel}</dd>
          </div>
        </dl>
        {!paid && !hosted && <p className="mt-3 text-sm text-muted">{settings.orders.paymentNotice}</p>}
        {hosted && order.paymentStatus === "pending" && order.status !== "cancelled" && <div className="mt-5"><ResumeCheckout token={token} /></div>}

        <section aria-labelledby="recap-title" className="mt-12">
          <h2 id="recap-title" className="eyebrow text-muted">{t("Récapitulatif")}</h2>
          <ul className="mt-3 divide-y divide-line border-y border-line">
            {order.lines.map((l, i) => (
              <li key={i} className="flex justify-between gap-4 py-4 text-sm">
                <div>
                  <p className="font-semibold">
                    {tx(l.label ?? "")} {l.quantity > 1 && <span className="text-muted">× {l.quantity}</span>}
                  </p>
                  <p className="text-muted">{l.items.map((it) => `${tx(it.color ?? "")} · ${it.size}`).join(" + ")}</p>
                </div>
                <p className="price">{formatEUR(l.totalCents)}</p>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-1.5 text-sm">
            <div className="flex justify-between"><dt className="text-muted">{t("Sous-total")}</dt><dd>{formatEUR(order.subtotalCents)}</dd></div>
            {order.discountCents > 0 && (
              <div className="flex justify-between text-brand"><dt>{t("Remise pack")}</dt><dd>−{formatEUR(order.discountCents)}</dd></div>
            )}
            <div className="flex justify-between"><dt className="text-muted">{t("Livraison")}</dt><dd>{order.shippingCents ? formatEUR(order.shippingCents) : t("Offerte")}</dd></div>
            <div className="flex items-baseline justify-between border-t border-line pt-3">
              <dt className="eyebrow">{t("Total à régler")}</dt>
              <dd className="price text-2xl">{formatEUR(order.totalCents)}</dd>
            </div>
          </dl>
        </section>

        <section aria-labelledby="ship-title" className="mt-10 grid gap-6 sm:grid-cols-2">
          <div>
            <h2 id="ship-title" className="eyebrow text-muted">{t("Livraison")}</h2>
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
            <h2 className="eyebrow text-muted">{t("Et ensuite ?")}</h2>
            <ol className="mt-2 space-y-1.5 text-sm text-ink-2">
              <li>1. {hosted ? t("La boutique rapproche ta commande avec une preuve de paiement vérifiée.") : t("Nous confirmons ta commande par e-mail.")}</li>
              <li>2. {hosted ? t("Un retour du partenaire ne constitue pas une confirmation de paiement.") : t("Tu règles selon les instructions reçues.")}</li>
              <li>3. {t("Expédition, puis {summary}.", { summary: settings.shipping.summary.toLowerCase() })}</li>
            </ol>
          </div>
        </section>

        <div className="mt-12 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href={href("/")}>{t("Retour à la boutique")}</ButtonLink>
          <ButtonLink href={href("/#contact")} variant="outline">{t("Une question ?")}</ButtonLink>
        </div>
        <p className="mt-6 text-xs text-muted">{t("Conserve cette page : son lien te permet de retrouver ta demande.")}</p>
      </div>
    </div>
  );
}
