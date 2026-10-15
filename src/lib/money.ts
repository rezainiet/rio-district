const eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

/** All amounts are stored as integer cents to avoid floating-point drift. */
export function formatEUR(cents: number) {
  return eur.format(cents / 100);
}

export function centsToInput(cents: number) {
  return (cents / 100).toFixed(2);
}

/** Parses "19,99" or "19.99" into cents. Returns NaN on invalid input. */
export function inputToCents(value: string | number) {
  const n = typeof value === "number" ? value : Number(String(value).replace(",", ".").trim());
  if (!Number.isFinite(n)) return NaN;
  return Math.round(n * 100);
}

export function percentOff(fullCents: number, paidCents: number) {
  if (fullCents <= 0 || paidCents >= fullCents) return 0;
  return Math.round(((fullCents - paidCents) / fullCents) * 100);
}
