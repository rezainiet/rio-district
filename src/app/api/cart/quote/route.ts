import type { NextRequest } from "next/server";
import { z } from "zod";
import { cartLineSchema } from "@/lib/validation";
import { errorJson, json, parseBody } from "@/lib/http";
import { quoteCart } from "@/lib/orders";

const schema = z.object({ lines: z.array(cartLineSchema).max(20) });

/** Server-verified prices for the checkout summary. Read-only, no side effects. */
export async function POST(req: NextRequest) {
  const body = await parseBody(req, schema);
  if (!body.ok) return body.response;
  try {
    const quote = await quoteCart(body.data.lines);
    return json({ ok: true, quote });
  } catch (err) {
    console.error("[quote]", err);
    return errorJson(500, "Impossible de calculer le total pour le moment.");
  }
}
