import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-paper px-4">
      <div className="text-center">
        <p className="eyebrow text-muted">Erreur 404</p>
        <h1 className="display mt-3 text-7xl md:text-9xl">Page introuvable.</h1>
        <p className="mx-auto mt-4 max-w-sm text-ink-2">Ce lien n&apos;existe pas ou plus. Les vestes, elles, sont toujours là.</p>
        <Link href="/" className={buttonClass("primary", "lg", "mt-8")}>
          Retour à la boutique
        </Link>
      </div>
    </main>
  );
}
