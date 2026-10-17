import type { Metadata } from "next";
import { CheckoutView } from "@/components/store/CheckoutView";
import { ButtonLink } from "@/components/ui/Button";
import { parseDirectCheckout } from "@/lib/direct-checkout";

export const metadata: Metadata = { title: "Commande", robots: { index: false } };

export default async function CheckoutPage({ searchParams }: PageProps<"/commande">) {
  const { achat } = await searchParams;
  const directLine = parseDirectCheckout(achat);
  if (achat !== undefined && !directLine) {
    return <div className="container-x checkout-page py-12">
      <h1 className="display checkout-title">Sélection indisponible</h1>
      <p className="mt-4 text-muted">Choisis à nouveau ta couleur et ta taille pour continuer.</p>
      <ButtonLink href="/#collection" className="mt-6">Voir la collection</ButtonLink>
    </div>;
  }
  return <CheckoutView key={directLine ? JSON.stringify(directLine) : "cart"} directLine={directLine} />;
}
