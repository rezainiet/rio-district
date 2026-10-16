import type { Metadata } from "next";
import Link from "next/link";
import { getSettings } from "@/lib/catalog";
import { returnsSections } from "@/lib/policies";
import { previewsEnabled } from "@/lib/storefront";
import { MailIcon, ReturnIcon } from "@/components/ui/icons";

export async function generateMetadata(): Promise<Metadata> {
  const { returnsPolicy } = await getSettings();
  return {
    title: "Retours & remboursements",
    description: `Retour possible sous ${returnsPolicy.windowDays} jours après réception : démarche, remboursement et contact du service client.`,
    alternates: { canonical: "/retours-remboursements" },
  };
}

/**
 * Returns & Refunds, built from settings.returnsPolicy. Terms the shop has not
 * confirmed yet are never stated publicly: in production they are simply left
 * out; in development they appear as "À confirmer" so the client sees what is missing.
 */
export default async function ReturnsPage() {
  const { returnsPolicy: policy, contactEmail } = await getSettings();
  const showPending = previewsEnabled();
  const sections = returnsSections(policy).filter((s) => s.body || (showPending && s.pending));
  const pendingCount = returnsSections(policy).filter((s) => s.pending).length;

  return (
    <div className="container-x pb-20 pt-8 md:pb-28 md:pt-14">
      <div className="mx-auto max-w-3xl">
        {showPending && policy.status === "draft" && (
          <p className="mb-6 rounded-xl border border-dashed border-[#7d6a43] px-4 py-3 text-sm text-[#d9bf86]">
            Aperçu développement : {pendingCount} point{pendingCount > 1 ? "s" : ""} de la politique attend{pendingCount > 1 ? "ent" : ""} la
            confirmation de la boutique. En production, ils ne sont pas affichés tant qu&apos;ils ne sont pas confirmés.
          </p>
        )}
        <p className="lab">Aide</p>
        <h1 className="display t-title mt-3 uppercase">Retours & remboursements</h1>

        <div className="mt-8 flex items-start gap-4 rounded-2xl border border-[#4a3f2a] bg-paper-2 p-5 sm:p-6">
          <ReturnIcon width={26} height={26} className="mt-0.5 shrink-0 text-brand" />
          <div>
            <p className="text-lg font-semibold">Retour possible sous {policy.windowDays} jours après réception.</p>
            <p className="mt-2 leading-relaxed text-ink-2">
              Tu disposes de {policy.windowDays} jours après la réception de ta commande pour demander un retour. Contacte notre service client
              avec ton numéro de commande pour recevoir les instructions.
            </p>
          </div>
        </div>

        <ol className="mt-8 grid gap-3 sm:grid-cols-3" aria-label="Comment retourner un article">
          {["Écris-nous avec ton numéro de commande", "Reçois les instructions et l'adresse de retour", "Envoie le colis : remboursement après vérification"].map((t, i) => (
            <li key={t} className="flex gap-3 rounded-2xl border border-line p-4 sm:block">
              <span className="price text-xl text-brand">{i + 1}</span>
              <p className="text-[15px] sm:mt-2">{t}</p>
            </li>
          ))}
        </ol>

        <div className="mt-10 divide-y divide-line border-y border-line">
          {sections.map((s) => (
            <section key={s.title} className="grid gap-2 py-6 sm:grid-cols-[200px_1fr] sm:gap-8">
              <h2 className="text-[15px] font-bold uppercase tracking-[0.08em]">{s.title}</h2>
              <div className="space-y-2 text-[16px] leading-relaxed text-ink-2">
                {s.body && <p>{s.body}</p>}
                {showPending && s.pending && (
                  <p className="rounded-lg border border-dashed border-[#7d6a43] px-3 py-2 text-sm text-[#d9bf86]">
                    <span className="font-semibold uppercase tracking-[0.1em]">À confirmer</span> · {s.pending}
                  </p>
                )}
              </div>
            </section>
          ))}
          <section className="grid gap-2 py-6 sm:grid-cols-[200px_1fr] sm:gap-8">
            <h2 className="text-[15px] font-bold uppercase tracking-[0.08em]">Tes droits</h2>
            <p className="text-[16px] leading-relaxed text-ink-2">
              Ce délai de {policy.windowDays} jours s&apos;ajoute à tes droits légaux, qu&apos;il ne remplace pas : droit de rétractation pour les achats
              à distance et garantie légale de conformité.
            </p>
          </section>
        </div>

        <div className="mt-10 rounded-2xl border border-line bg-paper-2 p-5 sm:p-6">
          <p className="flex items-center gap-3 font-semibold">
            <MailIcon width={20} height={20} className="text-brand" /> Besoin d&apos;aide ?
          </p>
          <p className="mt-2 leading-relaxed text-ink-2">
            Contacte notre service client avec ton numéro de commande : <span className="break-all text-ink">{contactEmail}</span> ou le{" "}
            <Link href="/#contact" className="underline underline-offset-4 hover:text-brand">formulaire de contact</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
