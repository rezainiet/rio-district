import { getActiveProducts, getSettings } from "@/lib/catalog";
import { manrope, syne } from "@/lib/store-fonts";
import { PageHeader } from "@/components/admin/ui";
import { PromotionsForm } from "@/components/admin/PromotionsForm";

export const metadata = { title: "Promotions" };

export default async function PromotionsPage() {
  const [settings, products] = await Promise.all([getSettings(), getActiveProducts()]);
  const images = products.flatMap((p) => p.images.slice(0, 2).map((img, i) => ({ url: img.url, label: `${p.name}${i ? " (vue 2)" : ""}` })));
  return (
    <>
      <PageHeader
        title="Promotions"
        description="Compte à rebours et pop-ups. Tout est désactivé tant qu'une vraie campagne n'est pas configurée : n'annonce que des offres réellement disponibles, avec de vraies dates. Rien ici ne modifie les prix."
      />
      <PromotionsForm
        initial={{ countdown: settings.countdown, popups: settings.popups }}
        storeName={settings.storeName}
        images={images}
        fontClass={`${syne.variable} ${manrope.variable}`}
      />
    </>
  );
}
