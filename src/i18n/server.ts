import "server-only";
import { headers } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_HEADER, isLocale, type Locale } from "./config";
import { translator, type Translator } from "./translate";

/** Locale of the current storefront request (set by src/proxy.ts; French when absent). */
export async function getLocale(): Promise<Locale> {
  const value = (await headers()).get(LOCALE_HEADER);
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/** { locale, t, tx, href } for a server component, route handler or generateMetadata. */
export async function getT(): Promise<Translator> {
  return translator(await getLocale());
}

/** Same, for a route handler that only has the request. */
export function requestT(req: Request): Translator {
  const value = req.headers.get(LOCALE_HEADER);
  return translator(isLocale(value) ? value : DEFAULT_LOCALE);
}
