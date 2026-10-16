import type { Metadata } from "next";
import Link from "next/link";
import { getSettings } from "@/lib/catalog";
import { rangeLong, shortDay } from "@/lib/delivery-plan";
import { RETURNS_PATH, storePlan } from "@/lib/storefront";
import { paymentsEnabled } from "@/lib/payments";
import { ReturnIcon, TruckIcon } from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "Livraison",
  description: "Délais et frais de livraison Rio District, suivi de colis, retours et paiement.",
};

/** Delivery information from the store settings (delivery plan, returns policy, payment state). */
export default async function ShippingPage() {
  const s = await getSettings();
  const plan = storePlan(s);
  const free = s.shipping.priceCents === 0;
  return (
    <div className="container-x pb-20 pt-8 md:pb-28 md:pt-14">
      <div className="mx-auto max-w-3xl">
        <p className="lab">Aide</p>
        <h1 className="display t-title mt-3 uppercase">Livraison</h1>

        <div className="mt-8 flex items-start gap-4 rounded-2xl border border-line bg-paper-2 p-5 sm:p-6">
          <TruckIcon width={26} height={26} className="mt-0.5 shrink-0 text-brand" />
          <div>
            <p className="text-lg font-semibold">{free ? "Livraison offerte et suivie" : "Livraison suivie"}</p>
            <p className="mt-2 leading-relaxed text-ink-2">
              En {plan.minDays} à {plan.maxDays} jours ouvrés après la confirmation de ta commande. Pour une commande passée aujourd&apos;hui :
              expédition prévue le {shortDay(plan.dispatchDay)}, livraison estimée {rangeLong(plan.deliveryFrom, plan.deliveryTo)}.
            </p>
          </div>
        </div>

        <section className="mt-10">
          <h2 className="text-[15px] font-bold uppercase tracking-[0.08em]">Détails</h2>
          <p className="mt-3 text-[16px] leading-relaxed text-ink-2">{s.shipping.details.replace(/\s*Un e-mail de suivi.*$/, "")}</p>
          <p className="mt-3 text-[16px] leading-relaxed text-ink-2">
            Le numéro de suivi t&apos;est envoyé par e-mail à l&apos;expédition. Les délais sont calculés en jours ouvrés, hors week-ends et jours fériés.
          </p>
        </section>

        <section className="mt-10 rounded-2xl border border-[#4a3f2a] bg-paper-2 p-5 sm:p-6">
          <h2 className="flex items-center gap-3 text-lg font-semibold">
            <ReturnIcon width={22} height={22} className="text-brand" /> Retour possible sous {s.returnsPolicy.windowDays} jours après réception
          </h2>
          <p className="mt-2 leading-relaxed text-ink-2">
            Contacte notre service client avec ton numéro de commande pour recevoir les instructions.{" "}
            <Link href={RETURNS_PATH} className="text-ink underline underline-offset-4 hover:text-brand">Retours & remboursements</Link>
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-[15px] font-bold uppercase tracking-[0.08em]">Paiement</h2>
          <p className="mt-3 text-[16px] leading-relaxed text-ink-2">
            {paymentsEnabled() ? "Le paiement se fait en ligne à la fin de la commande." : s.orders.paymentNotice}
          </p>
        </section>

        <p className="mt-10 text-[15px] text-muted">
          Une question ? Écris-nous à{" "}
          <a className="break-all text-ink-2 underline underline-offset-4" href={`mailto:${s.contactEmail}`}>{s.contactEmail}</a>.
        </p>
      </div>
    </div>
  );
}
