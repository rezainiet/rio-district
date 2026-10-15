import type { NextRequest } from "next/server";
import { loginSchema } from "@/lib/validation";
import { clientIp, errorJson, json, parseBody, rateLimit, sameOrigin } from "@/lib/http";
import { createSession, verifyCredentials } from "@/lib/auth";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return errorJson(403, "Origine refusée.");
  const ip = clientIp(req);
  if (!rateLimit(`login:${ip}`, 8, 15 * 60_000)) {
    return errorJson(429, "Trop de tentatives. Réessaie dans 15 minutes.");
  }
  const body = await parseBody(req, loginSchema);
  if (!body.ok) return body.response;

  const user = await verifyCredentials(body.data.email, body.data.password);
  if (!user) return errorJson(401, "E-mail ou mot de passe incorrect.");

  await createSession(String(user._id), req.headers.get("user-agent") ?? undefined);
  return json({ ok: true });
}
