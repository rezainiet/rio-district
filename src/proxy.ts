import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "./lib/session-cookie";
import { LOCALE_HEADER, resolvePublicPath } from "./i18n/config";

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
 * Storefront language (src/i18n/config.ts). The proxy only decides the locale
 * from the public URL and passes it in a request header (any value sent by the
 * browser is overwritten), and redirects non-canonical URLs. Mapping Spanish
 * URLs (/producto/…) and /fr to their French-named routes is done by the
 * rewrites in next.config.ts, which run after the proxy and are always
 * internal (a NextResponse.rewrite here fails behind nginx).
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return adminGate(req);

  const { locale, redirect } = resolvePublicPath(pathname);
  if (redirect !== undefined && redirect !== pathname) {
    const url = req.nextUrl.clone(); // keeps the query string (?offre=…, utm_…, fbclid…)
    url.pathname = redirect;
    return NextResponse.redirect(url, 308);
  }

  const headers = new Headers(req.headers);
  headers.set(LOCALE_HEADER, locale);
  const res = NextResponse.next({ request: { headers } });
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
