import type { NextRequest } from "next/server";
import { errorJson, json, sameOrigin } from "@/lib/http";
import { destroySession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return errorJson(403, "Origine refusée.");
  await destroySession();
  return json({ ok: true });
}
