import type { Metadata } from "next";
import { CheckoutView } from "@/components/store/CheckoutView";
import { ButtonLink } from "@/components/ui/Button";
import { parseDirectCheckout } from "@/lib/direct-checkout";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Commande"), robots: { index: false } };
}

export default async function CheckoutPage({ searchParams }: PageProps<"/commande">) {
  const { achat } = await searchParams;
  const directLine = parseDirectCheckout(achat);
  if (achat !== undefined && !directLine) {
    const { t, href } = await getT();
    return <div className="container-x checkout-page py-12">
      <h1 className="display checkout-title">{t("Sélection indisponible")}</h1>
      <p className="mt-4 text-muted">{t("Choisis à nouveau ta couleur et ta taille pour continuer.")}</p>
      <ButtonLink href={href("/#collection")} className="mt-6">{t("Voir la collection")}</ButtonLink>
    </div>;
  }
  return <CheckoutView key={directLine ? JSON.stringify(directLine) : "cart"} directLine={directLine} />;
}
