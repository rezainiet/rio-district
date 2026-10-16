import type { Metadata } from "next";
import { getSettings } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Livraison & retours",
  description: "Délais de livraison, frais et conditions de retour Rio District.",
};

export default async function ShippingPage() {
  const s = await getSettings();
  return (
    <div className="container-x py-12 md:py-20">
      <div className="mx-auto max-w-2xl">
        <h1 className="display text-[30px] uppercase sm:text-[40px] md:text-[60px]">Livraison & retours</h1>
        <section className="mt-10">
          <h2 className="eyebrow text-muted">Livraison</h2>
          <p className="mt-3 text-[17px] leading-relaxed">{s.shipping.details}</p>
        </section>
        <section className="mt-10">
          <h2 className="eyebrow text-muted">Retours & échanges</h2>
          <p className="mt-3 text-[17px] leading-relaxed">{s.returns.details}</p>
        </section>
        <section className="mt-10">
          <h2 className="eyebrow text-muted">Paiement</h2>
          <p className="mt-3 text-[17px] leading-relaxed">{s.orders.paymentNotice}</p>
        </section>
        <p className="mt-10 text-sm text-muted">
          Une question ? Écris-nous à{" "}
          <a className="underline" href={`mailto:${s.contactEmail}`}>
            {s.contactEmail}
          </a>
          .
        </p>
      </div>
    </div>
  );
}
