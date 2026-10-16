/**
 * Pre-purchase delivery plan (client-safe, no I/O): order → dispatch → delivery.
 *
 * Every number comes from settings.dispatch. Business days skip weekends,
 * French public holidays and any closed dates the shop adds. Dates are
 * computed on the Europe/Paris calendar. This is an ESTIMATE shown before
 * purchase, never a live tracking status.
 */

export type DispatchSettings = {
  /** Business days to prepare and hand the parcel to the carrier, after the order. */
  handlingDays: number;
  /** Carrier business days after dispatch (min / max). */
  transitMinDays: number;
  transitMaxDays: number;
  /** Orders placed after this Paris hour count from the next business day. null = no cutoff announced. */
  cutoffHour: number | null;
  /** Extra closed days (YYYY-MM-DD), e.g. stock-taking or holidays of the warehouse. */
  closedDates: string[];
  /** false until the client confirms these values (the page then shows them as estimates "à confirmer"). */
  confirmed: boolean;
};

/**
 * Split of the CURRENT public promise (2 to 4 business days after the order,
 * settings.shipping) into 1 day of preparation + 1 to 3 days of transit.
 * No cutoff hour is announced until the client gives one.
 */
export const DEFAULT_DISPATCH: DispatchSettings = {
  handlingDays: 1,
  transitMinDays: 1,
  transitMaxDays: 3,
  cutoffHour: null,
  closedDates: [],
  confirmed: false,
};

const TZ = "Europe/Paris";

/** Calendar day in Paris as a UTC-midnight Date (safe for day arithmetic). */
function parisDay(now: Date) {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  return new Date(`${p}T00:00:00Z`);
}

function parisHour(now: Date) {
  return Number(new Intl.DateTimeFormat("en-US", { timeZone: TZ, hourCycle: "h23", hour: "2-digit" }).format(now));
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);

/** Easter Sunday (Gregorian, anonymous algorithm). */
function easter(year: number) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

/** The 11 public holidays of metropolitan France. */
export function frenchHolidays(year: number): string[] {
  const e = easter(year);
  return [
    `${year}-01-01`, iso(addDays(e, 1)), `${year}-05-01`, `${year}-05-08`, iso(addDays(e, 39)), iso(addDays(e, 50)),
    `${year}-07-14`, `${year}-08-15`, `${year}-11-01`, `${year}-11-11`, `${year}-12-25`,
  ];
}

function isBusinessDay(d: Date, closed: Set<string>) {
  const wd = d.getUTCDay();
  return wd !== 0 && wd !== 6 && !closed.has(iso(d));
}

function nextBusinessDays(from: Date, n: number, closed: Set<string>) {
  let d = from;
  let added = 0;
  while (added < n) {
    d = addDays(d, 1);
    if (isBusinessDay(d, closed)) added++;
  }
  return d;
}

export type DeliveryPlan = {
  /** Day the order counts from (today, or the next business day after the cutoff / on a closed day). */
  orderDay: string;
  dispatchDay: string;
  deliveryFrom: string;
  deliveryTo: string;
  /** Total business days announced (min / max), for the "2 à 4 jours ouvrés" wording. */
  minDays: number;
  maxDays: number;
  /** True when the order is placed after the cutoff hour or on a non-business day. */
  countsFromNextBusinessDay: boolean;
  cutoffHour: number | null;
  confirmed: boolean;
};

export function deliveryPlan(s: DispatchSettings, now = new Date()): DeliveryPlan {
  const today = parisDay(now);
  const year = today.getUTCFullYear();
  const closed = new Set([...frenchHolidays(year), ...frenchHolidays(year + 1), ...s.closedDates]);
  const late = s.cutoffHour !== null && parisHour(now) >= s.cutoffHour;
  const start = !isBusinessDay(today, closed) || late ? nextBusinessDays(today, 1, closed) : today;
  const dispatch = s.handlingDays > 0 ? nextBusinessDays(start, s.handlingDays, closed) : start;
  const from = nextBusinessDays(dispatch, Math.max(0, s.transitMinDays), closed);
  const to = nextBusinessDays(dispatch, Math.max(s.transitMinDays, s.transitMaxDays), closed);
  return {
    orderDay: iso(today),
    dispatchDay: iso(dispatch),
    deliveryFrom: iso(from),
    deliveryTo: iso(to),
    minDays: s.handlingDays + s.transitMinDays,
    maxDays: s.handlingDays + Math.max(s.transitMinDays, s.transitMaxDays),
    countsFromNextBusinessDay: iso(start) !== iso(today),
    cutoffHour: s.cutoffHour,
    confirmed: s.confirmed,
  };
}

/* ---------- French wording ---------- */

const d = (day: string) => new Date(`${day}T12:00:00Z`);
const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", ...o });

/** "lun. 19 oct." */
export function shortDay(day: string) {
  return fmt({ weekday: "short", day: "numeric", month: "short" }).format(d(day));
}

/** "entre le 20 et le 22 octobre" / "entre le 30 octobre et le 2 novembre" / "le 20 octobre". */
export function rangeLong(from: string, to: string) {
  const long = fmt({ day: "numeric", month: "long" });
  if (from === to) return `le ${long.format(d(from))}`;
  const sameMonth = from.slice(0, 7) === to.slice(0, 7);
  return sameMonth
    ? `entre le ${fmt({ day: "numeric" }).format(d(from))} et le ${long.format(d(to))}`
    : `entre le ${long.format(d(from))} et le ${long.format(d(to))}`;
}

/** "20 – 22 oct." */
export function rangeShort(from: string, to: string) {
  const short = fmt({ day: "numeric", month: "short" });
  if (from === to) return short.format(d(from));
  return from.slice(0, 7) === to.slice(0, 7)
    ? `${fmt({ day: "numeric" }).format(d(from))} – ${short.format(d(to))}`
    : `${short.format(d(from))} – ${short.format(d(to))}`;
}
