import type { BundleConfig, CartLineInput, CartQuote, PricedLine, PublicProduct } from "./types";

export const MAX_LINE_QUANTITY = 10;

/**
 * Pure cart pricing. The browser uses it for instant feedback; the server runs
 * the exact same function against prices loaded from MongoDB, and only the
 * server result is ever persisted. Client-submitted prices are never read.
 */
export function priceCart(
  input: CartLineInput[],
  products: Map<string, PublicProduct>,
  bundle: BundleConfig,
  shippingCents: number,
): CartQuote {
  const lines: PricedLine[] = [];
  const errors: CartQuote["errors"] = [];

  input.forEach((line, index) => {
    const qty = Math.trunc(line.quantity);
    if (!(qty >= 1 && qty <= MAX_LINE_QUANTITY)) {
      errors.push({ index, message: "Quantité invalide." });
      return;
    }

    const refs = line.kind === "single" ? [{ productId: line.productId, size: line.size }] : line.items;

    if (line.kind === "bundle") {
      if (!bundle.enabled) {
        errors.push({ index, message: "L'offre pack n'est plus disponible." });
        return;
      }
      if (refs.length !== bundle.quantity) {
        errors.push({ index, message: `Le pack doit contenir ${bundle.quantity} vestes.` });
        return;
      }
    }

    const items: PricedLine["items"] = [];
    for (const ref of refs) {
      const product = products.get(ref.productId);
      if (!product) {
        errors.push({ index, message: "Cet article n'est plus disponible." });
        return;
      }
      const size = product.sizes.find((s) => s.label === ref.size);
      if (!size || !size.available) {
        errors.push({ index, message: `${product.name} : taille ${ref.size} indisponible.` });
        return;
      }
      if (line.kind === "bundle" && !product.bundleEligible) {
        errors.push({ index, message: `${product.name} n'est pas éligible au pack.` });
        return;
      }
      items.push({
        productId: product.id,
        slug: product.slug,
        name: product.name,
        color: product.color.name,
        size: ref.size,
        image: product.images[0]?.url ?? "",
        unitPriceCents: product.priceCents,
      });
    }

    const compareAt = items.reduce((sum, i) => sum + i.unitPriceCents, 0);
    // A bundle can never cost more than buying the items separately.
    const unit = line.kind === "bundle" ? Math.min(bundle.priceCents, compareAt) : compareAt;

    lines.push({
      kind: line.kind,
      label: line.kind === "bundle" ? bundle.label : items[0].name,
      items,
      quantity: qty,
      unitPriceCents: unit,
      compareAtCents: compareAt,
      totalCents: unit * qty,
      savingsCents: (compareAt - unit) * qty,
    });
  });

  const subtotalCents = lines.reduce((s, l) => s + l.compareAtCents * l.quantity, 0);
  const discountCents = lines.reduce((s, l) => s + l.savingsCents, 0);
  const itemsCount = lines.reduce((s, l) => s + l.items.length * l.quantity, 0);
  const shipping = lines.length > 0 ? shippingCents : 0;

  return {
    lines,
    errors,
    itemsCount,
    subtotalCents,
    discountCents,
    shippingCents: shipping,
    totalCents: subtotalCents - discountCents + shipping,
  };
}

/** Units required per product/size, used for stock checks. */
export function stockRequirements(lines: PricedLine[]) {
  const need = new Map<string, { productId: string; size: string; qty: number }>();
  for (const line of lines) {
    for (const item of line.items) {
      const key = `${item.productId}:${item.size}`;
      const current = need.get(key) ?? { productId: item.productId, size: item.size, qty: 0 };
      current.qty += line.quantity;
      need.set(key, current);
    }
  }
  return [...need.values()];
}
