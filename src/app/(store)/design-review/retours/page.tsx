import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSettings } from "@/lib/catalog";
import { designReviewEnabled } from "@/lib/design-review";
import { returnsSections } from "@/lib/policies";
import { ReturnIcon } from "@/components/ui/icons";
import { ProposedAnnouncement } from "@/components/design-review/ProposedAnnouncement";

export const metadata: Metadata = { title: "Retours & remboursements (projet)", robots: { index: false, follow: false } };

/**
 * Draft of the dedicated Returns & Refunds page, built from settings.returnsPolicy.
 * Undecided points are shown as "À confirmer" so the client sees exactly what
 * remains to be decided. Not linked from the live site until approved.
 */
export default async function ReturnsPreviewPage() {
  if (!designReviewEnabled()) notFound();
  const { returnsPolicy: policy, contactEmail, announcement } = await getSettings();
  const sections = returnsSections(policy);
  const pending = sections.filter((s) => s.pending).length;

  return (
    <>
      {announcement.enabled && <ProposedAnnouncement text={announcement.text} windowDays={policy.windowDays} />}
      <div className="border-b border-line bg-[#121110]">
        <p className="container-x py-2.5 text-xs text-ink-2">
          <span className="lab mr-2">Projet de page</span>
          {policy.status === "draft" ? `Brouillon — ${pending} point${pending > 1 ? "s" : ""} à confirmer par la boutique avant publication.` : "Politique approuvée."}{" "}
          <Link href="/design-review" className="underline underline-offset-4">Retour aux concepts</Link>
        </p>
      </div>
      <div className="container-x py-12 md:py-20">
        <div className="mx-auto max-w-3xl">
          <p className="lab">Aide</p>
          <h1 className="display mt-3 text-[20px] uppercase sm:text-[36px] md:text-[44px]">Retours & remboursements</h1>

          <div className="mt-8 flex items-start gap-4 rounded-2xl border border-[#4a3f2a] bg-paper-2 p-6">
            <ReturnIcon width={28} height={28} className="mt-0.5 shrink-0 text-brand" />
            <div>
              <p className="font-display text-xl font-bold uppercase">Retour possible sous {policy.windowDays} jours après réception.</p>
              <p className="mt-2 leading-relaxed text-ink-2">
                Tu disposes de {policy.windowDays} jours après la réception de ta commande pour demander un retour. Contacte notre service client avec ton numéro de
                commande pour recevoir les instructions.
              </p>
            </div>
          </div>

          <ol className="mt-10 grid gap-3 sm:grid-cols-3" aria-label="Comment retourner un article">
            {["Écris-nous avec ton numéro de commande", "Reçois les instructions et l'adresse de retour", "Envoie le colis : remboursement après vérification"].map((t, i) => (
              <li key={t} className="rounded-2xl border border-line p-5">
                <span className="font-display text-sm font-bold text-brand">0{i + 1}</span>
                <p className="mt-2 text-sm">{t}</p>
              </li>
            ))}
          </ol>

          <div className="mt-12 divide-y divide-line border-y border-line">
            {sections.map((s) => (
              <section key={s.title} className="grid gap-2 py-6 sm:grid-cols-[200px_1fr] sm:gap-8">
                <h2 className="font-display text-base font-bold uppercase">{s.title}</h2>
                <div className="space-y-2 text-[15px] leading-relaxed text-ink-2">
                  {s.body && <p>{s.body}</p>}
                  {s.pending && (
                    <p className="flex flex-col gap-1 rounded-lg border border-dashed border-[#7d6a43] px-3 py-2 text-sm text-[#d9bf86] sm:inline-flex sm:flex-row sm:gap-2">
                      <span className="whitespace-nowrap text-xs font-semibold uppercase tracking-[0.12em]">À confirmer</span>
                      <span>{s.pending}</span>
                    </p>
                  )}
                </div>
              </section>
            ))}
            <section className="grid gap-2 py-6 sm:grid-cols-[200px_1fr] sm:gap-8">
              <h2 className="font-display text-base font-bold uppercase">Tes droits</h2>
              <div className="space-y-2 text-[15px] leading-relaxed text-ink-2">
                <p>
                  Ce délai de {policy.windowDays} jours s&apos;ajoute à tes droits légaux, qu&apos;il ne remplace pas : droit de rétractation pour les achats à distance
                  et garantie légale de conformité.
                </p>
                <p className="flex flex-col gap-1 rounded-lg border border-dashed border-[#7d6a43] px-3 py-2 text-sm text-[#d9bf86] sm:inline-flex sm:flex-row sm:gap-2">
                  <span className="whitespace-nowrap text-xs font-semibold uppercase tracking-[0.12em]">À confirmer</span>
                  <span>Formulation juridique exacte et formulaire de rétractation, à valider par la boutique (ou son conseil)</span>
                </p>
              </div>
            </section>
          </div>

          <div className="mt-12 rounded-2xl border border-line bg-paper-2 p-6">
            <p className="font-semibold">Besoin d&apos;aide ?</p>
            <p className="mt-1 text-ink-2">
              Contacte notre service client avec ton numéro de commande :{" "}
              <a href={`mailto:${contactEmail}`} className="text-ink underline underline-offset-4">{contactEmail}</a> ou le{" "}
              <Link href="/#contact" className="underline underline-offset-4">formulaire de contact</Link>.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
