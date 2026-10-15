"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";

export default function StoreError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container-x py-24 text-center">
      <p className="eyebrow text-muted">Oups</p>
      <h1 className="display mt-3 text-6xl md:text-8xl">Un souci technique.</h1>
      <p className="mx-auto mt-4 max-w-md text-ink-2">
        La page n&apos;a pas pu se charger. Ton panier est conservé : réessaie dans un instant.
      </p>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Button onClick={reset}>Réessayer</Button>
        <ButtonLink href="/" variant="outline">Accueil</ButtonLink>
      </div>
    </div>
  );
}
