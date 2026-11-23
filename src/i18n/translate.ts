/**
 * Translation by French source text (client-safe, no I/O).
 *
 * The French wording stays in the code and is the key: t("Ajouter au panier")
 * returns it unchanged on the French site and its Spanish entry on /es. A
 * missing entry falls back to French, so a forgotten string can never break a
 * page; tests/i18n.test.ts fails the build when a t("…") literal has no entry.
 *
 * - t(key, vars)  translates a template written in the code: t("Taille {size} épuisée", { size }).
 * - tx(text)      translates text that is already built: database content, a server
 *                 message, a French sentence from a helper. Exact entry first, then any
 *                 template whose shape matches ("Veste Brésil {color}" ← "Veste Brésil Noir"),
 *                 with each captured value translated in turn.
 */
import { localizePath, type Locale } from "./config";
import { ES } from "./es";

export type Vars = Record<string, string | number | null | undefined>;

export function interpolate(template: string, vars?: Vars) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => {
    const v = vars[name];
    return v === undefined || v === null ? whole : String(v);
  });
}

const missing = new Set<string>();
function warnMissing(key: string) {
  if (process.env.NODE_ENV === "production" || missing.has(key)) return;
  missing.add(key);
  console.warn(`[i18n] es: no translation for ${JSON.stringify(key.length > 120 ? `${key.slice(0, 117)}…` : key)}`);
}

export function translate(locale: Locale, key: string, vars?: Vars): string {
  if (locale === "es") {
    const es = ES[key];
    if (es !== undefined) return interpolate(es, vars);
    warnMissing(key);
  }
  return interpolate(key, vars);
}

type Template = { re: RegExp; names: string[]; es: string };
let templates: Template[] | null = null;

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function compiled(): Template[] {
  if (templates) return templates;
  templates = Object.entries(ES)
    .filter(([fr]) => /\{\w+\}/.test(fr))
    .map(([fr, es]) => {
      const names: string[] = [];
      const source = fr
        .split(/(\{\w+\})/)
        .map((part) => {
          const m = /^\{(\w+)\}$/.exec(part);
          if (!m) return escapeRe(part);
          names.push(m[1]);
          return "(.+?)";
        })
        .join("");
      return { re: new RegExp(`^${source}$`, "s"), names, es, fixed: fr.replace(/\{\w+\}/g, "").length };
    })
    // The template with the most fixed text wins ("Taille {size} épuisée" before "{x} épuisée").
    .sort((a, b) => b.fixed - a.fixed)
    .map(({ re, names, es }) => ({ re, names, es }));
  return templates;
}

export function translateText(locale: Locale, text: string, depth = 0): string {
  if (locale !== "es" || !text) return text;
  const exact = ES[text] ?? ES[text.trim()];
  if (exact !== undefined) return exact;
  if (depth < 4) {
    for (const t of compiled()) {
      const m = t.re.exec(text);
      if (!m) continue;
      const vars: Vars = {};
      t.names.forEach((name, i) => {
        vars[name] = translateText(locale, m[i + 1], depth + 1);
      });
      return interpolate(t.es, vars);
    }
  }
  if (depth === 0 && /[a-zà-ÿ]{3}/i.test(text)) warnMissing(text);
  return text;
}

/** The helpers handed to pages and components. */
export type Translator = {
  locale: Locale;
  t: (key: string, vars?: Vars) => string;
  tx: (text: string) => string;
  href: (internalHref: string) => string;
};

const cache = new Map<Locale, Translator>();

export function translator(locale: Locale): Translator {
  let tr = cache.get(locale);
  if (!tr) {
    tr = {
      locale,
      t: (key, vars) => translate(locale, key, vars),
      tx: (text) => translateText(locale, text),
      href: (internalHref) => localizePath(internalHref, locale),
    };
    cache.set(locale, tr);
  }
  return tr;
}
