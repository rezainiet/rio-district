import type { NextRequest } from "next/server";
import { z } from "zod";
import { clientIp, errorJson, json, parseBody, rateLimit, sameOrigin } from "@/lib/http";
import { connectDB } from "@/lib/db";
import { Order, type OrderDoc } from "@/models/Order";
import { HostedCheckoutError } from "@/lib/payments/everflow";
import { issueHostedCheckout } from "@/lib/payments/hosted";
import { activeEverflowConfig } from "@/lib/payments/forwarding-flag";

const schema = z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{24}$/) });
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return errorJson(403, "Origine refusée.");
  if (!rateLimit(`checkout:${clientIp(req)}`, 12, 600_000)) return errorJson(429, "Réessaie dans quelques minutes.");
  const body = await parseBody(req, schema);
  if (!body.ok) return body.response;
  try {
    const config = activeEverflowConfig();
    if (!config) return errorJson(409, "Le paiement externe est désactivé. Contacte la boutique pour cette commande.");
    await connectDB();
    const order = await Order.findOne({ publicToken: body.data.token }).lean<OrderDoc>();
    if (!order) return errorJson(404, "Commande introuvable.");
    return json({ ok: true, checkout: await issueHostedCheckout(order, config) });
  } catch (error) {
    if (error instanceof HostedCheckoutError) return errorJson(409, error.message);
    return errorJson(500, "Connexion interrompue. Réessaie : la même commande sera conservée.");
  }
}
