"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { useT } from "@/i18n/client";

export default function StoreError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t, href } = useT();
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container-x py-24 text-center">
      <p className="eyebrow text-muted">{t("Oups")}</p>
      <h1 className="display mt-3 text-[30px] uppercase sm:text-[40px] md:text-[60px]">{t("Un souci technique.")}</h1>
      <p className="mx-auto mt-4 max-w-md text-ink-2">
        {t("La page n'a pas pu se charger. Ton panier est conservé : réessaie dans un instant.")}
      </p>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Button onClick={reset}>{t("Réessayer")}</Button>
        <ButtonLink href={href("/")} variant="outline">{t("Accueil")}</ButtonLink>
      </div>
    </div>
  );
}
