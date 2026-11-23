import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";
import { getT } from "@/i18n/server";

export default async function NotFound() {
  const { t, href } = await getT();
  return (
    <main className="grid min-h-dvh place-items-center bg-paper px-4">
      <div className="text-center">
        <p className="eyebrow text-muted">{t("Erreur 404")}</p>
        <h1 className="display mt-3 text-7xl md:text-9xl">{t("Page introuvable.")}</h1>
        <p className="mx-auto mt-4 max-w-sm text-ink-2">{t("Ce lien n'existe pas ou plus. Les vestes, elles, sont toujours là.")}</p>
        <Link href={href("/")} className={buttonClass("primary", "lg", "mt-8")}>
          {t("Retour à la boutique")}
        </Link>
      </div>
    </main>
  );
}
