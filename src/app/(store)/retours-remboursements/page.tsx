import type { Metadata } from "next";
import Link from "next/link";
import { getSettings } from "@/lib/catalog";
import { returnsSections } from "@/lib/policies";
import { previewsEnabled } from "@/lib/storefront";
import { MailIcon, ReturnIcon } from "@/components/ui/icons";
import { alternates } from "@/i18n/config";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const [{ returnsPolicy }, { t, locale }] = await Promise.all([getSettings(), getT()]);
  return {
    title: t("Retours & remboursements"),
    description: t("Retour possible sous {n} jours après réception : démarche, remboursement et contact du service client.", { n: returnsPolicy.windowDays }),
    alternates: alternates("/retours-remboursements", locale),
  };
}

/**
 * Returns & Refunds, built from settings.returnsPolicy. Terms the shop has not
 * confirmed yet are never stated publicly: in production they are simply left
 * out; in development they appear as "À confirmer" so the client sees what is missing.
 */
export default async function ReturnsPage() {
  const [{ returnsPolicy: policy, contactEmail }, { t, tx, href, locale }] = await Promise.all([getSettings(), getT()]);
  const showPending = previewsEnabled();
  // Free-text answers written in the admin (damaged parcel, wrong item) are translated like other settings text.
  const localPolicy = {
    ...policy,
    damagedParcel: policy.damagedParcel === null ? null : tx(policy.damagedParcel),
    wrongItem: policy.wrongItem === null ? null : tx(policy.wrongItem),
  };
  const all = returnsSections(localPolicy, locale);
  const sections = all.filter((s) => s.body || (showPending && s.pending));
  const pendingCount = all.filter((s) => s.pending).length;
  const steps = [
    t("Écris-nous avec ton numéro de commande"),
    t("Reçois les instructions et l'adresse de retour"),
    t("Envoie le colis : remboursement après vérification"),
  ];

  return (
    <div className="container-x pb-20 pt-8 md:pb-28 md:pt-14">
      <div className="mx-auto max-w-3xl">
        {showPending && policy.status === "draft" && (
          <p className="mb-6 rounded-xl border border-dashed border-[#7d6a43] px-4 py-3 text-sm text-[#d9bf86]">
            {pendingCount > 1
              ? t("Aperçu développement : {n} points de la politique attendent la confirmation de la boutique. En production, ils ne sont pas affichés tant qu'ils ne sont pas confirmés.", { n: pendingCount })
              : t("Aperçu développement : {n} point de la politique attend la confirmation de la boutique. En production, ils ne sont pas affichés tant qu'ils ne sont pas confirmés.", { n: pendingCount })}
          </p>
        )}
        <p className="lab">{t("Aide")}</p>
        <h1 className="display t-title mt-3 uppercase">{t("Retours & remboursements")}</h1>

        <div className="mt-8 flex items-start gap-4 rounded-2xl border border-[#4a3f2a] bg-paper-2 p-5 sm:p-6">
          <ReturnIcon width={26} height={26} className="mt-0.5 shrink-0 text-brand" />
          <div>
            <p className="text-lg font-semibold">{t("Retour possible sous {n} jours après réception.", { n: policy.windowDays })}</p>
            <p className="mt-2 leading-relaxed text-ink-2">
              {t(
                "Tu disposes de {n} jours après la réception de ta commande pour demander un retour. Contacte notre service client avec ton numéro de commande pour recevoir les instructions.",
                { n: policy.windowDays },
              )}
            </p>
          </div>
        </div>

        <ol className="mt-8 grid gap-3 sm:grid-cols-3" aria-label={t("Comment retourner un article")}>
          {steps.map((step, i) => (
            <li key={step} className="flex gap-3 rounded-2xl border border-line p-4 sm:block">
              <span className="price text-xl text-brand">{i + 1}</span>
              <p className="text-[15px] sm:mt-2">{step}</p>
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
                    <span className="font-semibold uppercase tracking-[0.1em]">{t("À confirmer")}</span> · {s.pending}
                  </p>
                )}
              </div>
            </section>
          ))}
          <section className="grid gap-2 py-6 sm:grid-cols-[200px_1fr] sm:gap-8">
            <h2 className="text-[15px] font-bold uppercase tracking-[0.08em]">{t("Tes droits")}</h2>
            <p className="text-[16px] leading-relaxed text-ink-2">
              {t(
                "Ce délai de {n} jours s'ajoute à tes droits légaux, qu'il ne remplace pas : droit de rétractation pour les achats à distance et garantie légale de conformité.",
                { n: policy.windowDays },
              )}
            </p>
          </section>
        </div>

        <div className="mt-10 rounded-2xl border border-line bg-paper-2 p-5 sm:p-6">
          <p className="flex items-center gap-3 font-semibold">
            <MailIcon width={20} height={20} className="text-brand" /> {t("Besoin d'aide ?")}
          </p>
          <p className="mt-2 leading-relaxed text-ink-2">
            {t("Contacte notre service client avec ton numéro de commande :")} <span className="break-all text-ink">{contactEmail}</span> {t("ou le")}{" "}
            <Link href={href("/#contact")} className="underline underline-offset-4 hover:text-brand">{t("formulaire de contact")}</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
