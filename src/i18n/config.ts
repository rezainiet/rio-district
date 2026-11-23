/**
 * Storefront languages (client-safe, no I/O).
 *
 * Spanish is the default language: the home page "/" and every Spanish page
 * name (/producto/…, /carrito, /pedido…) are Spanish. French keeps all its
 * existing page URLs (/produit/…, /panier, /commande…) so links already shared,
 * ads and order-confirmation links keep working unchanged; only the French
 * home page moved, to /fr. The routes themselves are the French-named folders:
 * the proxy rewrites a Spanish URL to its internal route and passes the
 * locale in a request header; pages and components then translate their text.
 */

export const LOCALES = ["es", "fr"] as const;
export type Locale = (typeof LOCALES)[number];
/** Language of "/" and of any page whose URL does not name a language. */
export const DEFAULT_LOCALE: Locale = "es";

/** Request header set by the proxy on every storefront request. */
export const LOCALE_HEADER = "x-store-locale";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** Locale tags for Intl (dates, numbers) and Open Graph. */
export const INTL_LOCALE: Record<Locale, string> = { fr: "fr-FR", es: "es-ES" };
export const OG_LOCALE: Record<Locale, string> = { fr: "fr_FR", es: "es_ES" };
export const LOCALE_NAME: Record<Locale, string> = { fr: "Français", es: "Español" };

/** French home page (the only French URL that is not its internal route). */
const FR_HOME = "/fr";

/** Internal (French) storefront route → its Spanish public name. Longest first. */
const ES_ROUTES: readonly (readonly [fr: string, es: string])[] = [
  ["/commande/confirmation", "/pedido/confirmacion"],
  ["/commande/paiement-test", "/pedido/pago-prueba"],
  ["/commande", "/pedido"],
  ["/produit", "/producto"],
  ["/panier", "/carrito"],
  ["/livraison-retours", "/envios-devoluciones"],
  ["/retours-remboursements", "/devoluciones-reembolsos"],
];

const hasPrefix = (path: string, prefix: string) => path === prefix || path.startsWith(`${prefix}/`);

function splitHref(href: string) {
  const i = href.search(/[?#]/);
  return i < 0 ? { path: href, rest: "" } : { path: href.slice(0, i), rest: href.slice(i) };
}

/**
 * Public URL of an internal storefront href for a locale.
 * es: "/produit/x?offre=pack#acheter" → "/producto/x?offre=pack#acheter", "/#collection" → "/#collection".
 * fr: "/produit/x" → "/produit/x" (unchanged), "/#collection" → "/fr#collection".
 * Anything that is not a storefront page (API, uploads, images, admin, external) is returned as is.
 */
export function localizePath(href: string, locale: Locale): string {
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  const { path, rest } = splitHref(href);
  if (path === "/" || path === "") return locale === "fr" ? `${FR_HOME}${rest}` : `/${rest}`;
  if (locale === "fr") return href;
  for (const [fr, es] of ES_ROUTES) if (hasPrefix(path, fr)) return `${es}${path.slice(fr.length)}${rest}`;
  return href;
}

/**
 * Locale and internal (French) route of a public pathname, or a `redirect`
 * (pathname only; the caller keeps the query string) when the URL is not the
 * canonical one: "/fr/produit/x" → "/produit/x", and the former "/es/…" URLs.
 */
export function resolvePublicPath(pathname: string): { locale: Locale; path: string; redirect?: string } {
  if (pathname === FR_HOME || pathname === `${FR_HOME}/`) return { locale: "fr", path: "/" };
  if (pathname.startsWith(`${FR_HOME}/`)) {
    const inner = resolvePublicPath(pathname.slice(FR_HOME.length)).path;
    return { locale: "fr", path: inner, redirect: localizePath(inner, "fr") };
  }
  if (pathname === "/es" || pathname.startsWith("/es/")) {
    const inner = resolvePublicPath(pathname.slice(3) || "/").path;
    return { locale: "es", path: inner, redirect: localizePath(inner, "es") };
  }
  for (const [fr, es] of ES_ROUTES) {
    if (hasPrefix(pathname, es)) return { locale: "es", path: fr + pathname.slice(es.length) };
    if (hasPrefix(pathname, fr)) return { locale: "fr", path: pathname };
  }
  return { locale: DEFAULT_LOCALE, path: pathname };
}

/** The same page in another language, from a public href (pathname + search + hash). */
export function switchLocaleHref(publicHref: string, to: Locale): string {
  const { path, rest } = splitHref(publicHref);
  return localizePath(resolvePublicPath(path).path + rest, to);
}

/** Metadata `alternates` for an internal path: canonical in the page's language + <link rel="alternate" hreflang> for each. */
export function alternates(internalPath: string, locale: Locale) {
  return {
    canonical: localizePath(internalPath, locale),
    languages: { es: localizePath(internalPath, "es"), fr: localizePath(internalPath, "fr"), "x-default": localizePath(internalPath, DEFAULT_LOCALE) },
  };
}
