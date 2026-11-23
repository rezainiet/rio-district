/**
 * Customer-facing stock status (client-safe, no I/O).
 *
 * The product database is the only source: a quantity is shown only when the
 * size is TRACKED (stock is a number in Admin → Produits) and at or below the
 * display threshold. Untracked sizes get a neutral "Disponible", never a number.
 */
import type { Locale } from "../i18n/config";
import { translate, type Vars } from "../i18n/translate";
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

/** Message for the product (no size chosen yet) or for the chosen size, in the page language (French by default). */
export function stockMessage(info: StockInfo, size: Size | null, locale: Locale = "fr"): StockMessage {
  const t = (key: string, vars?: Vars) => translate(locale, key, vars);
  const available = info.sizes.filter((s) => s.state !== "out");
  if (available.length === 0) return { tone: "out", text: t("Épuisé pour le moment") };
  if (size) {
    const s = info.sizes.find((x) => x.label === size);
    if (!s || s.state === "out") return { tone: "out", text: t("Taille {size} épuisée", { size }) };
    if (s.state === "low") {
      const n = s.remaining!;
      return { tone: "low", text: n > 1 ? t("Plus que {n} articles en {size}", { n, size }) : t("Plus que {n} article en {size}", { n, size }) };
    }
    return s.tracked ? { tone: "ok", text: t("En stock en {size}", { size }) } : { tone: "neutral", text: t("Disponible en {size}", { size }) };
  }
  if (info.total !== null) {
    const n = info.total;
    return { tone: "low", text: n > 1 ? t("Plus que {n} articles disponibles", { n }) : t("Plus que {n} article disponible", { n }) };
  }
  const low = info.sizes.filter((s) => s.state === "low");
  if (low.length > 0) {
    return { tone: "low", text: low.length > 1 ? t("Stock limité sur certaines tailles") : t("Stock limité sur la taille {size}", { size: low[0].label }) };
  }
  if (info.tracked) return { tone: "ok", text: t("En stock") };
  return { tone: "neutral", text: t("Disponible du {from} au {to}", { from: available[0].label, to: available[available.length - 1].label }) };
}
