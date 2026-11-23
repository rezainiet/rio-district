import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "./lib/session-cookie";
import { LOCALE_HEADER, isLocale, resolvePublicPath } from "./i18n/config";

/**
 * Set on the request of a language rewrite. A browser could send it too, but it would only change
 * the language of its own uncached response (storefront pages are private, no-store).
 */
const REWRITE_HEADER = "x-store-locale-rewrite";

/** The admin is French: its pages get the French locale header (html lang). */
function adminHeaders(req: NextRequest) {
  const headers = new Headers(req.headers);
  headers.set(LOCALE_HEADER, "fr");
  return headers;
}

/**
 * Optimistic gate for the admin area: no session cookie → login page.
 * The real authorisation check (session lookup in MongoDB) happens in the
 * admin layout and in every /api/admin handler.
 */
function adminGate(req: NextRequest) {
  if (req.nextUrl.pathname === "/admin/login") return NextResponse.next({ request: { headers: adminHeaders(req) } });
  if (!req.cookies.has(SESSION_COOKIE)) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next({ request: { headers: adminHeaders(req) } });
}

/**
 * Storefront language (src/i18n/config.ts): Spanish URLs (/, /producto/…) are
 * rewritten to the French-named routes, French URLs (/produit/…, /fr) are served
 * as they are; the locale goes in a request header. Any locale header sent by
 * the browser itself is overwritten, so the URL alone decides the language.
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return adminGate(req);

  // `next start` runs the proxy again on the internal route of a rewrite (/producto/x → /produit/x,
  // /fr → /): keep the language chosen from the public URL instead of reading the internal one.
  const rewritten = req.headers.get(REWRITE_HEADER);
  if (isLocale(rewritten)) {
    const headers = new Headers(req.headers);
    headers.set(LOCALE_HEADER, rewritten);
    const res = NextResponse.next({ request: { headers } });
    res.headers.set("Content-Language", rewritten);
    return res;
  }

  const { locale, path, redirect } = resolvePublicPath(pathname);
  if (redirect !== undefined && redirect !== pathname) {
    const url = req.nextUrl.clone(); // keeps the query string (?offre=…, utm_…, fbclid…)
    url.pathname = redirect;
    return NextResponse.redirect(url, 308);
  }

  const headers = new Headers(req.headers);
  headers.set(LOCALE_HEADER, locale);
  if (path === pathname) {
    const res = NextResponse.next({ request: { headers } });
    res.headers.set("Content-Language", locale);
    return res;
  }

  // A language prefix in front of /admin or /api is not a storefront page: let it 404.
  if (path === "/admin" || path.startsWith("/admin/") || path.startsWith("/api/")) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = path;
  headers.set(REWRITE_HEADER, locale);
  const res = NextResponse.rewrite(url, { request: { headers } });
  res.headers.set("Content-Language", locale);
  return res;
}

export const config = {
  matcher: [
    "/admin/:path*",
    // Pages only: no API, Next internals, uploads or files with an extension.
    "/((?!api/|_next/|uploads/|.*\\.[A-Za-z0-9]+$).*)",
  ],
};
