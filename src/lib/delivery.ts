function addBusinessDays(from: Date, days: number) {
  const d = new Date(from);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return d;
}

const fmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" });

/** "Livraison estimée entre le 20 et le 22 octobre" — an estimate, never a promise. */
export function deliveryEstimate(minDays: number, maxDays: number, now = new Date()) {
  const a = addBusinessDays(now, minDays);
  const b = addBusinessDays(now, Math.max(minDays, maxDays));
  const [da, ma] = fmt.format(a).split(" ");
  const fb = fmt.format(b);
  const range = fmt.format(a) === fb ? `le ${fb}` : ma === fb.split(" ")[1] ? `entre le ${da} et le ${fb}` : `entre le ${fmt.format(a)} et le ${fb}`;
  return `Livraison estimée ${range}`;
}

const short = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" });

/** Compact range for tight UI, e.g. "20 – 22 oct.". */
export function deliveryRange(minDays: number, maxDays: number, now = new Date()) {
  const a = addBusinessDays(now, minDays);
  const b = addBusinessDays(now, Math.max(minDays, maxDays));
  const [da, ma] = short.format(a).split(" ");
  const fb = short.format(b);
  if (short.format(a) === fb) return fb;
  return ma === fb.split(" ")[1] ? `${da} – ${fb}` : `${short.format(a)} – ${fb}`;
}
