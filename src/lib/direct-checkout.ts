import { cartLineSchema } from "./validation";
import type { CartLineInput } from "./types";

/** Public selection only. Product availability and prices are checked separately. */
export function parseDirectCheckout(value: unknown): CartLineInput | null {
  if (typeof value !== "string" || value.length > 1000) return null;
  try {
    const result = cartLineSchema.safeParse(JSON.parse(value));
    return result.success && result.data.quantity === 1 ? result.data : null;
  } catch {
    return null;
  }
}
