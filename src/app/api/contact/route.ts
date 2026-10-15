import type { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { contactSchema } from "@/lib/validation";
import { clientIp, errorJson, json, parseBody, rateLimit, sameOrigin } from "@/lib/http";
import { ContactMessage } from "@/models/misc";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return errorJson(403, "Origine refusée.");
  if (!rateLimit(`contact:${clientIp(req)}`, 5, 10 * 60_000)) {
    return errorJson(429, "Trop de messages envoyés. Réessaie dans quelques minutes.");
  }
  const body = await parseBody(req, contactSchema);
  if (!body.ok) return body.response;
  if (body.data.website) return json({ ok: true }); // honeypot: silently accept

  await connectDB();
  await ContactMessage.create({ email: body.data.email, message: body.data.message });
  return json({ ok: true }, 201);
}
