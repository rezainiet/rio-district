import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type ZodType } from "zod";
import { fieldErrors } from "./validation";
import { getAdmin, type AdminIdentity } from "./auth";

export function json<T>(data: T, init?: number | ResponseInit) {
  return NextResponse.json(data, typeof init === "number" ? { status: init } : init);
}

export function errorJson(status: number, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status });
}

export async function parseBody<T>(req: NextRequest, schema: ZodType<T>) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { ok: false as const, response: errorJson(400, "Requête invalide.") };
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    return {
      ok: false as const,
      response: errorJson(422, "Certains champs sont invalides.", { fields: fieldErrors(result.error) }),
    };
  }
  return { ok: true as const, data: result.data };
}

export function clientIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

/**
 * CSRF defence for cookie-authenticated mutations: the request must come from
 * our own origin. Combined with SameSite=Lax cookies this blocks cross-site posts.
 */
export function sameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin) return req.method === "GET";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** Wraps an admin API handler: same-origin check + session check + error mapping. */
export function adminRoute<C>(
  handler: (req: NextRequest, ctx: C, admin: AdminIdentity) => Promise<Response>,
) {
  return async (req: NextRequest, ctx: C) => {
    if (req.method !== "GET" && !sameOrigin(req)) return errorJson(403, "Origine refusée.");
    const admin = await getAdmin();
    if (!admin) return errorJson(401, "Session expirée. Reconnecte-toi.");
    try {
      return await handler(req, ctx, admin);
    } catch (err) {
      if (err instanceof ZodError) return errorJson(422, "Données invalides.", { fields: fieldErrors(err) });
      console.error("[admin api]", err);
      return errorJson(500, "Erreur serveur.");
    }
  };
}

/* ---------- Tiny in-memory rate limiter (per process) ---------- */

const buckets = new Map<string, { count: number; reset: number }>();

// Limits are relaxed 10× outside production so local testing is not blocked.
const LIMIT_FACTOR = process.env.NODE_ENV === "production" ? 1 : 10;

export function rateLimit(key: string, limit: number, windowMs: number) {
  limit *= LIMIT_FACTOR;
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= limit;
}
