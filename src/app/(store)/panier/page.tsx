import type { Metadata } from "next";
import { CartPageView } from "@/components/store/CartPageView";

export const metadata: Metadata = { title: "Panier", robots: { index: false } };

export default function CartPage() {
  return <CartPageView />;
}
