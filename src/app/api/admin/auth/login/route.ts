import type { NextRequest } from "next/server";
import { loginSchema } from "@/lib/validation";
import { clientIp, errorJson, json, parseBody, rateLimit, sameOrigin } from "@/lib/http";
import { createSession, verifyCredentials } from "@/lib/auth";
import { log } from "@/lib/log";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return errorJson(403, "Origine refusée.");
  const ip = clientIp(req);
  if (!rateLimit(`login:${ip}`, 8, 15 * 60_000)) {
    log.warn("admin.login_rate_limited", { ip });
    return errorJson(429, "Trop de tentatives. Réessaie dans 15 minutes.");
  }
  const body = await parseBody(req, loginSchema);
  if (!body.ok) return body.response;

  const user = await verifyCredentials(body.data.email, body.data.password);
  if (!user) {
    log.warn("admin.login_failed", { email: body.data.email, ip });
    return errorJson(401, "Identifiant ou mot de passe incorrect.");
  }
  log.info("admin.login", { email: user.email, ip });

  await createSession(String(user._id), req.headers.get("user-agent") ?? undefined);
  return json({ ok: true });
}
