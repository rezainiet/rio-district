/** Size system shared by storefront, admin and server validation. */
export const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "3XL"] as const;
export type Size = (typeof SIZES)[number];

export function isSize(value: unknown): value is Size {
  return typeof value === "string" && (SIZES as readonly string[]).includes(value);
}

export type SizeChartRow = {
  size: Size;
  chest: string;
  waist: string;
  back: number;
  sleeve: number;
};

/** Garment measurements (cm) as published on the reference store. */
export const DEFAULT_SIZE_CHART: SizeChartRow[] = [
  { size: "XS", chest: "90 – 96", waist: "76 – 82", back: 66, sleeve: 62 },
  { size: "S", chest: "96 – 100", waist: "82 – 86", back: 68, sleeve: 63 },
  { size: "M", chest: "100 – 104", waist: "86 – 90", back: 70, sleeve: 64 },
  { size: "L", chest: "104 – 110", waist: "90 – 96", back: 72, sleeve: 65 },
  { size: "XL", chest: "110 – 116", waist: "96 – 102", back: 74, sleeve: 66 },
  { size: "XXL", chest: "116 – 122", waist: "102 – 108", back: 76, sleeve: 67 },
  { size: "3XL", chest: "122 – 128", waist: "108 – 114", back: 78, sleeve: 68 },
];

/**
 * PROVISIONAL size recommendation.
 *
 * score = weightKg + (heightCm − 170). The size is the first row whose
 * `maxScore` is greater than the score. The thresholds were calibrated so the
 * recommender matches every answer we observed from the reference store's
 * simulator (see docs/AUDIT.md). They are editable in Admin → Réglages and
 * must be replaced once the client supplies their real sizing rule.
 */
export type SizeRule = { size: Size; maxScore: number | null };

export const DEFAULT_SIZE_RULES: SizeRule[] = [
  { size: "XS", maxScore: 42 },
  { size: "S", maxScore: 66 },
  { size: "M", maxScore: 78 },
  { size: "L", maxScore: 94 },
  { size: "XL", maxScore: 110 },
  { size: "XXL", maxScore: 118 },
  { size: "3XL", maxScore: null },
];

export function recommendSize(
  heightCm: number,
  weightKg: number,
  rules: SizeRule[] = DEFAULT_SIZE_RULES,
): Size | null {
  if (!(heightCm >= 130 && heightCm <= 230) || !(weightKg >= 30 && weightKg <= 200)) return null;
  const score = weightKg + (heightCm - 170);
  for (const rule of rules) {
    if (rule.maxScore === null || score < rule.maxScore) return rule.size;
  }
  return rules.at(-1)?.size ?? null;
}
