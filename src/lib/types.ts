import type { Size } from "./sizes";

/** Product shape sent to the browser (no internal fields, no raw stock numbers). */
export type PublicProduct = {
  id: string;
  slug: string;
  name: string;
  group: string;
  color: { name: string; hex: string };
  tagline: string;
  description: string;
  details: string[];
  material: string;
  care: string;
  priceCents: number;
  currency?: string;
  compareAtCents: number | null;
  images: { url: string; alt: string; kind: "photo" | "placeholder" }[];
  sizes: { label: Size; available: boolean; /** Only set when stock is tracked and low (≤ 3). */ remaining: number | null }[];
  bundleEligible: boolean;
};

export type BundleConfig = { enabled: boolean; quantity: number; priceCents: number; label: string };

/** Cart line as stored in the browser and submitted to the server. */
export type CartLineInput =
  | { kind: "single"; productId: string; size: Size; quantity: number }
  | { kind: "bundle"; items: { productId: string; size: Size }[]; quantity: number };

export type PricedLine = {
  kind: "single" | "bundle";
  label: string;
  items: {
    productId: string;
    slug: string;
    name: string;
    color: string;
    size: Size;
    image: string;
    unitPriceCents: number;
  }[];
  quantity: number;
  unitPriceCents: number;
  compareAtCents: number;
  totalCents: number;
  savingsCents: number;
};

export type CartQuote = {
  lines: PricedLine[];
  /** Index of each input line that could not be priced, with a French reason. */
  errors: { index: number; message: string }[];
  itemsCount: number;
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
};
