import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import { Order, type OrderDoc } from "@/models/Order";
import { PaymentAttempt } from "@/models/misc";
import { readEverflowConfig, EVERFLOW_OFFERS } from "@/lib/payments/everflow";
import { formatEUR } from "@/lib/money";
import { ButtonLink } from "@/components/ui/Button";
import { getSettings } from "@/lib/catalog";
import { getT } from "@/i18n/server";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Simulation de paiement"), robots: { index: false, follow: false }, referrer: "no-referrer" };
}
export default async function MockCheckoutPage({ params }: { params: Promise<{ token: string }> }) {
  const settings = await getSettings();
  if (!settings.paymentRedirect.enabled) notFound();
  let config;
  try { config = readEverflowConfig(process.env); } catch { notFound(); }
  if (config?.mode !== "mock") notFound();
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{24}$/.test(token)) notFound();
  await connectDB();
  const order = await Order.findOne({ publicToken: token, "payment.provider": "everflow", creationState: "ready" }).lean<OrderDoc>();
  if (!order) notFound();
  const attempt = await PaymentAttempt.findOne({ order: order._id, provider: "everflow", kind: "redirect", mode: "mock" }).lean();
  if (!attempt?.offer) notFound();
  const { t, tx, href } = await getT();
  return <section className="container-x py-12 md:py-20"><div className="mx-auto max-w-2xl rounded-3xl border border-line bg-paper-2 p-6 md:p-10">
    <p className="eyebrow text-brand">{t("Simulation locale · aucun débit")}</p><h1 className="display mt-4 text-3xl uppercase md:text-5xl">{t("Prêt pour le partenaire.")}</h1>
    <p className="mt-5 leading-relaxed text-ink-2">{t("Le parcours s’arrête ici en mode test. Aucun appel au domaine de suivi, aucune carte bancaire, aucun paiement confirmé.")}</p>
    <dl className="mt-8 grid gap-4 border-y border-line py-5 text-sm"><div className="flex justify-between"><dt>{t("Commande")}</dt><dd>{order.number}</dd></div><div className="flex justify-between"><dt>{t("Total TTC · livraison offerte")}</dt><dd className="price text-xl">{formatEUR(order.totalCents)}</dd></div><div className="flex justify-between"><dt>{t("Paiement")}</dt><dd>{t("En attente · non vérifié")}</dd></div></dl>
    <ul className="my-6 space-y-3">{order.lines.flatMap(l => l.items.map((item, i) => <li key={i} className="flex flex-wrap justify-between gap-2"><strong>{tx(item.name ?? "")}</strong><span className="text-muted">{tx(item.color ?? "")} · {item.size}</span></li>))}</ul>
    <p className="break-all text-xs text-muted">{t("Offre prévue : {url} (non visitée)", { url: EVERFLOW_OFFERS[attempt.offer].url })}</p>
    <div className="mt-8 flex flex-col gap-3 sm:flex-row"><ButtonLink href={href(`/commande/confirmation/${token}`)}>{t("Voir ma commande en attente")}</ButtonLink><ButtonLink href={href("/panier")} variant="outline">{t("Retour au panier")}</ButtonLink></div>
    <p className="mt-5 text-sm text-muted">{t("Ton panier est conservé. Reprendre le paiement réutilise cette commande et sa réservation.")}</p>
  </div></section>;
}
