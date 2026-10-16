import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSettings } from "@/lib/catalog";
import { conceptsEnabled } from "@/lib/concepts";
import { returnsHeadline, returnsHowTo, returnsSections } from "@/lib/policies";
import { ReturnIcon } from "@/components/ui/icons";

export const metadata: Metadata = { title: "Retours & remboursements (projet)", robots: { index: false, follow: false } };

/**
 * Draft of the dedicated Returns & Refunds page. Every value comes from
 * settings.returnsPolicy; undecided points are shown as "À confirmer" so the
 * client can see exactly what remains to be decided before publication.
 */
export default async function ReturnsDraftPage() {
  if (!conceptsEnabled()) notFound();
  const { returnsPolicy: policy, contactEmail } = await getSettings();
  const sections = returnsSections(policy);
  const pending = sections.filter((s) => s.pending).length;

  return (
    <>
      <div className="border-b border-line bg-paper-2">
        <p className="container-x py-2.5 text-xs text-ink-2">
          <span className="lab mr-2">Projet de page</span>
          {policy.status === "draft" ? `Brouillon — ${pending} point${pending > 1 ? "s" : ""} à confirmer par la boutique avant publication.` : "Politique approuvée."}
        </p>
      </div>
      <div className="container-x py-12 md:py-20">
        <div className="mx-auto max-w-3xl">
          <p className="lab">Aide</p>
          <h1 className="display mt-3 text-[20px] uppercase sm:text-[32px] md:text-[40px]">Retours & remboursements</h1>

          <div className="mt-8 flex items-start gap-4 rounded-[18px] border border-line bg-paper-2 p-6">
            <ReturnIcon width={28} height={28} className="mt-0.5 shrink-0 text-brand" />
            <div>
              <p className="font-display text-xl font-bold uppercase">{returnsHeadline(policy)}</p>
              <p className="mt-2 text-ink-2">{returnsHowTo(policy)}</p>
            </div>
          </div>

          <ol className="mt-10 grid gap-3 sm:grid-cols-3" aria-label="Comment retourner un article">
            {["Écris-nous avec ton numéro de commande", "Reçois la procédure et l'adresse de retour", "Envoie le colis, on te rembourse"].map((t, i) => (
              <li key={t} className="rounded-[18px] border border-line p-5">
                <span className="font-display text-sm font-bold text-brand">0{i + 1}</span>
                <p className="mt-2 text-sm">{t}</p>
              </li>
            ))}
          </ol>

          <div className="mt-12 divide-y divide-line border-y border-line">
            {sections.map((s) => (
              <section key={s.title} className="grid gap-2 py-6 sm:grid-cols-[220px_1fr] sm:gap-8">
                <h2 className="font-display text-base font-bold uppercase">{s.title}</h2>
                <div className="space-y-2 text-[15px] leading-relaxed text-ink-2">
                  {s.body && <p>{s.body}</p>}
                  {s.pending && (
                    <p className="flex flex-col gap-1 rounded-lg border border-dashed border-brand/60 px-3 py-2 text-sm text-brand sm:inline-flex sm:flex-row sm:gap-2">
                      <span className="whitespace-nowrap text-xs font-semibold uppercase tracking-[0.12em]">À confirmer</span>
                      <span>{s.pending}</span>
                    </p>
                  )}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-12 rounded-[18px] border border-line bg-paper-2 p-6">
            <p className="font-semibold">Besoin d&apos;aide ?</p>
            <p className="mt-1 text-ink-2">
              Contacte notre service client avec ton numéro de commande :{" "}
              <Link href="/#contact" className="underline underline-offset-4">formulaire de contact</Link>
              {contactEmail && (
                <>
                  {" "}ou <span className="text-ink">{contactEmail}</span>
                </>
              )}
              .
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
