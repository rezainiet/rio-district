import type { Metadata } from "next";
import { CartPageView } from "@/components/store/CartPageView";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Panier"), robots: { index: false } };
}

export default function CartPage() {
  return <CartPageView />;
}
