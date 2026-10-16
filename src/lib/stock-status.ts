/**
 * Customer-facing stock status (client-safe, no I/O).
 *
 * The product database is the only source: a quantity is shown only when the
 * size is TRACKED (stock is a number in Admin → Produits) and at or below the
 * display threshold. Untracked sizes get a neutral "Disponible", never a number.
 */
import type { Size } from "./sizes";

/** Quantities at or below this are shown to customers ("Plus que 7 articles disponibles"). */
export const STOCK_DISPLAY_THRESHOLD = 10;

export type SizeStock = {
  label: Size;
  state: "in" | "low" | "out";
  /** Exact remaining quantity, only when tracked and ≤ threshold. */
  remaining: number | null;
  tracked: boolean;
};

export type StockInfo = {
  sizes: SizeStock[];
  /** Every enabled size is tracked. */
  tracked: boolean;
  /** Units left across all sizes, only when every size is tracked and the total is ≤ threshold. */
  total: number | null;
  /** Preview only: quantities simulated for the design review (never in production). */
  simulated: boolean;
};

export function stockInfo(sizes: { label: Size; enabled: boolean; stock: number | null }[], simulated = false): StockInfo {
  const enabled = sizes.filter((s) => s.enabled);
  const out: SizeStock[] = sizes.map((s) => {
    const tracked = typeof s.stock === "number";
    if (!s.enabled || (tracked && s.stock! <= 0)) return { label: s.label, state: "out", remaining: tracked ? 0 : null, tracked };
    const low = tracked && s.stock! <= STOCK_DISPLAY_THRESHOLD;
    return { label: s.label, state: low ? "low" : "in", remaining: low ? s.stock : null, tracked };
  });
  const tracked = enabled.length > 0 && enabled.every((s) => typeof s.stock === "number");
  const sum = tracked ? enabled.reduce((n, s) => n + Math.max(0, s.stock as number), 0) : null;
  return { sizes: out, tracked, total: sum !== null && sum <= STOCK_DISPLAY_THRESHOLD ? sum : null, simulated };
}

export type StockMessage = { tone: "ok" | "low" | "out" | "neutral"; text: string };

const plural = (n: number, w: string) => `${n} ${w}${n > 1 ? "s" : ""}`;

/** Message for the product (no size chosen yet) or for the chosen size. */
export function stockMessage(info: StockInfo, size: Size | null): StockMessage {
  const available = info.sizes.filter((s) => s.state !== "out");
  if (available.length === 0) return { tone: "out", text: "Épuisé pour le moment" };
  if (size) {
    const s = info.sizes.find((x) => x.label === size);
    if (!s || s.state === "out") return { tone: "out", text: `Taille ${size} épuisée` };
    if (s.state === "low") return { tone: "low", text: `Plus que ${plural(s.remaining!, "article")} en ${size}` };
    return s.tracked ? { tone: "ok", text: `En stock en ${size}` } : { tone: "neutral", text: `Disponible en ${size}` };
  }
  if (info.total !== null) return { tone: "low", text: `Plus que ${plural(info.total, "article")} disponible${info.total > 1 ? "s" : ""}` };
  const low = info.sizes.filter((s) => s.state === "low");
  if (low.length > 0) return { tone: "low", text: `Stock limité sur ${low.length > 1 ? "certaines tailles" : `la taille ${low[0].label}`}` };
  if (info.tracked) return { tone: "ok", text: "En stock" };
  return { tone: "neutral", text: `Disponible du ${available[0].label} au ${available[available.length - 1].label}` };
}
