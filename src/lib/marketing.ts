/**
 * Promotional countdown and marketing pop-up configuration (client-safe, no I/O).
 *
 * Everything is OFF by default. A campaign only goes live when an admin has
 * enabled it, written its content and (for the countdown) entered a real end
 * date. Deadlines are stored as UTC ISO strings and shown in Europe/Paris time.
 * None of this changes prices: the server-side pricing (lib/pricing.ts) stays
 * the only source of truth.
 */

export const STORE_TZ = "Europe/Paris";

export type CountdownSettings = {
  enabled: boolean;
  title: string;
  text: string;
  ctaLabel: string;
  ctaHref: string;
  /** UTC ISO; optional (live as soon as it is enabled when empty). */
  startsAt: string | null;
  /** UTC ISO; required for the countdown to be shown. */
  endsAt: string | null;
  placement: { home: boolean; product: boolean };
};

type PopupContent = {
  enabled: boolean;
  title: string;
  text: string;
  ctaLabel: string;
  ctaHref: string;
  imageUrl: string;
  /** Days before the pop-up can be shown again after it was closed or used. */
  frequencyDays: number;
  startsAt: string | null;
  endsAt: string | null;
};

export type WelcomePopup = PopupContent & { delaySeconds: number };
export type ExitIntentPopup = PopupContent & { minSecondsOnPage: number };
export type CartReminderPopup = Omit<PopupContent, "ctaLabel" | "ctaHref" | "imageUrl"> & { delaySeconds: number };

export type PopupSettings = {
  welcome: WelcomePopup;
  exitIntent: ExitIntentPopup;
  cartReminder: CartReminderPopup;
};

export const DEFAULT_COUNTDOWN: CountdownSettings = {
  enabled: false,
  title: "",
  text: "",
  ctaLabel: "",
  ctaHref: "",
  startsAt: null,
  endsAt: null,
  placement: { home: true, product: false },
};

/**
 * Neutral copy approved for launch (it only describes the real collection and
 * the permanent 2-jacket pack). Every pop-up stays DISABLED until an admin
 * switches it on in Admin → Promotions.
 */
export const DEFAULT_POPUPS: PopupSettings = {
  welcome: {
    enabled: false,
    title: "Bienvenue chez Rio District",
    text: "Découvre notre collection de vestes Brésil, disponible en six coloris.",
    ctaLabel: "Découvrir la collection",
    ctaHref: "/#collection",
    imageUrl: "/products/reference/veste-bresil-noir-face.webp",
    frequencyDays: 30,
    startsAt: null,
    endsAt: null,
    delaySeconds: 12,
  },
  exitIntent: {
    enabled: false,
    title: "Avant de partir",
    text: "Découvre nos vestes et compose ton pack de deux coloris au choix.",
    ctaLabel: "Composer mon pack",
    ctaHref: "/produit/veste-bresil-noir?offre=pack#acheter",
    imageUrl: "/products/reference/veste-bresil-blanc-face.webp",
    frequencyDays: 14,
    startsAt: null,
    endsAt: null,
    minSecondsOnPage: 15,
  },
  cartReminder: {
    enabled: false,
    title: "Ton panier t'attend",
    text: "Retrouve les articles que tu as sélectionnés.",
    frequencyDays: 3,
    startsAt: null,
    endsAt: null,
    delaySeconds: 8,
  },
};

/* ---------- Activity rules (used by the server before anything is sent to the page) ---------- */

const ms = (iso: string | null) => (iso ? Date.parse(iso) : NaN);

function withinWindow(startsAt: string | null, endsAt: string | null, now: number) {
  const start = ms(startsAt);
  const end = ms(endsAt);
  if (!Number.isNaN(start) && now < start) return false;
  if (!Number.isNaN(end) && now >= end) return false;
  return true;
}

/** A countdown needs content AND a real, future end date. */
export function isCountdownLive(c: CountdownSettings, now = Date.now()) {
  return Boolean(c.enabled && c.title.trim() && c.endsAt && !Number.isNaN(ms(c.endsAt)) && withinWindow(c.startsAt, c.endsAt, now));
}

/** A pop-up needs to be enabled, have a title and a message, and be inside its dates. */
export function isPopupLive(p: { enabled: boolean; title: string; text: string; startsAt: string | null; endsAt: string | null }, now = Date.now()) {
  return Boolean(p.enabled && p.title.trim() && p.text.trim() && withinWindow(p.startsAt, p.endsAt, now));
}

/** Countdown payload for one placement, or null when nothing should be shown. */
export function countdownFor(c: CountdownSettings, placement: keyof CountdownSettings["placement"], now = Date.now()) {
  if (!c.placement[placement] || !isCountdownLive(c, now)) return null;
  return { title: c.title, text: c.text, ctaLabel: c.ctaLabel, ctaHref: c.ctaHref, endsAt: c.endsAt!, serverNow: now };
}

/** Only internal paths (or https URLs) are accepted as CTA destinations. */
export function isSafeHref(href: string) {
  return /^\/(?!\/)[^\s]*$/.test(href) || /^https:\/\/[^\s]+$/.test(href);
}

/* ---------- Countdown maths ---------- */

export function countdownParts(remainingMs: number) {
  const total = Math.max(0, Math.floor(remainingMs / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
    done: total === 0,
  };
}

/* ---------- Europe/Paris <-> UTC (admin inputs are Paris wall-clock times) ---------- */

function parisParts(utcMs: number) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: STORE_TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs));
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  return { y: get("year"), mo: get("month"), d: get("day"), h: get("hour"), mi: get("minute"), s: get("second") };
}

/** Offset of Paris from UTC at a given instant, in ms (+1 h in winter, +2 h in summer). */
function parisOffset(utcMs: number) {
  const p = parisParts(utcMs);
  return Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s) - Math.floor(utcMs / 1000) * 1000;
}

/** "2026-12-24T23:59" read as Paris time → UTC ISO string. */
export function parisLocalToUtc(local: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!m) return null;
  const guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  let utc = guess - parisOffset(guess);
  utc = guess - parisOffset(utc); // second pass settles DST transitions
  return new Date(utc).toISOString();
}

/** UTC ISO → "YYYY-MM-DDTHH:mm" Paris wall-clock (value for <input type="datetime-local">). */
export function utcToParisLocal(iso: string | null): string {
  if (!iso || Number.isNaN(Date.parse(iso))) return "";
  const p = parisParts(Date.parse(iso));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.y}-${pad(p.mo)}-${pad(p.d)}T${pad(p.h)}:${pad(p.mi)}`;
}

/** "dimanche 20 octobre à 23:59" in Paris time. */
export function formatParisDeadline(iso: string) {
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat("fr-FR", { timeZone: STORE_TZ, weekday: "long", day: "numeric", month: "long" }).format(d);
  const time = new Intl.DateTimeFormat("fr-FR", { timeZone: STORE_TZ, hour: "2-digit", minute: "2-digit" }).format(d);
  return `${day} à ${time}`;
}

export function formatParisDate(iso: string | Date) {
  return new Intl.DateTimeFormat("fr-FR", { timeZone: STORE_TZ, day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
}

/* ---------- Ratings ---------- */

export type RatingSummary = { count: number; average: number; distribution: Record<1 | 2 | 3 | 4 | 5, number> };

/** Average and distribution from real ratings only; average is rounded to one decimal. */
export function summarizeRatings(ratings: number[]): RatingSummary {
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as RatingSummary["distribution"];
  let sum = 0;
  for (const r of ratings) {
    const v = Math.min(5, Math.max(1, Math.round(r))) as 1 | 2 | 3 | 4 | 5;
    distribution[v] += 1;
    sum += v;
  }
  const count = ratings.length;
  return { count, average: count ? Math.round((sum / count) * 10) / 10 : 0, distribution };
}

/** Public reviewer name: first name + initial, whatever was typed. */
// "jean dupont" → "Jean D." ; "Julien" → "Julien".
export function displayName(raw: string) {
  const parts = raw.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Client";
  const cap = (s: string) => s.charAt(0).toLocaleUpperCase("fr-FR") + s.slice(1);
  const first = cap(parts[0]);
  if (parts.length === 1) return first;
  const last = parts[parts.length - 1].replace(/\.$/, "");
  return `${first} ${last.charAt(0).toLocaleUpperCase("fr-FR")}.`;
}

/** The distribution bars are only meaningful with a handful of reviews. */
export const MIN_REVIEWS_FOR_DISTRIBUTION = 5;

/* ---------- Pop-ups sent to the storefront (only live ones, content only) ---------- */

export type LivePopup = {
  title: string;
  text: string;
  ctaLabel: string;
  ctaHref: string;
  imageUrl: string;
  frequencyDays: number;
  /** Welcome: delay before showing. Exit intent: minimum time on site. Cart: delay. */
  seconds: number;
};
export type LivePopups = { welcome: LivePopup | null; exitIntent: LivePopup | null; cartReminder: LivePopup | null };

export function livePopups(p: PopupSettings, now = Date.now()): LivePopups {
  const pick = (x: PopupContent) => ({
    title: x.title,
    text: x.text,
    ctaLabel: x.ctaLabel,
    ctaHref: isSafeHref(x.ctaHref) ? x.ctaHref : "",
    imageUrl: x.imageUrl,
    frequencyDays: x.frequencyDays,
  });
  return {
    welcome: isPopupLive(p.welcome, now) ? { ...pick(p.welcome), seconds: p.welcome.delaySeconds } : null,
    exitIntent: isPopupLive(p.exitIntent, now) ? { ...pick(p.exitIntent), seconds: p.exitIntent.minSecondsOnPage } : null,
    cartReminder: isPopupLive(p.cartReminder, now)
      ? { title: p.cartReminder.title, text: p.cartReminder.text, ctaLabel: "", ctaHref: "", imageUrl: "", frequencyDays: p.cartReminder.frequencyDays, seconds: p.cartReminder.delaySeconds }
      : null,
  };
}

/** Pages where marketing pop-ups must never interrupt the visitor. */
export function popupsAllowedOn(pathname: string) {
  return !/^\/(commande|panier)(\/|$)/.test(pathname);
}
