import type { NextRequest } from "next/server";
import { errorJson, json } from "@/lib/http";
import { getPaymentProvider } from "@/lib/payments";
import { applyPaymentEvent } from "@/lib/payments/apply";

/**
 * Provider webhook endpoint. Inactive (501) until a provider adapter is
 * implemented and PAYMENT_PROVIDER is set. Never marks anything paid without
 * a verified signature.
 */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/payments/webhook/[provider]">) {
  const { provider } = await ctx.params;
  const adapter = getPaymentProvider();
  if (!adapter || adapter.id !== provider) return errorJson(501, "Paiement en ligne non configuré.");

  const raw = await req.text();
  try {
    const event = await adapter.verifyWebhook(raw, req.headers);
    await applyPaymentEvent(event);
    return json({ received: true });
  } catch (err) {
    console.error("[payments webhook]", err);
    return errorJson(400, "Webhook invalide.");
  }
}
