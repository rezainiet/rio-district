import type { NextRequest } from "next/server";
import { orderRequestSchema } from "@/lib/validation";
import { clientIp, errorJson, json, parseBody, rateLimit, sameOrigin } from "@/lib/http";
import { createOrderRequest, OrderError } from "@/lib/orders";
import { log } from "@/lib/log";
import { buildEverflowUrl, HostedCheckoutError, readEverflowConfig } from "@/lib/payments/everflow";
import { issueHostedCheckout } from "@/lib/payments/hosted";
import { getProductMap } from "@/lib/catalog";

/**
 * Creates an UNPAID order request. Prices, discounts and totals are
 * recomputed on the server from MongoDB; nothing price-related is read from
 * the request body. Idempotent on `idempotencyKey`.
 */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return errorJson(403, "Origine refusée.");
  const ip = clientIp(req);
  if (!rateLimit(`order:${ip}`, 8, 10 * 60_000)) {
    return errorJson(429, "Trop de tentatives. Réessaie dans quelques minutes.");
  }

  const body = await parseBody(req, orderRequestSchema);
  if (!body.ok) return body.response;
  if (body.data.website) return errorJson(400, "Requête invalide.");

  try {
    const hosted = readEverflowConfig(process.env);
    if (body.data.requireCheckout && !hosted) {
      throw new HostedCheckoutError("Le paiement est momentanément indisponible. Réessaie plus tard.");
    }
    const { order, duplicate } = await createOrderRequest(body.data, {
      ip,
      userAgent: req.headers.get("user-agent") ?? undefined,
    }, hosted ? { validate: async quote => {
      const products = await getProductMap(quote.lines.flatMap(line => line.items.map(item => item.productId)));
      if (quote.lines.some(line => line.items.some(item => !products.get(item.productId)?.images.some(image => image.url === item.image && image.kind === "photo")))) {
        throw new HostedCheckoutError("Une photo produit approuvée est nécessaire pour le paiement externe.");
      }
      buildEverflowUrl({ ...quote, customer: body.data.customer, shipping: body.data.customer }, hosted, "preflight-reference", false);
    } } : undefined);
    const checkout = hosted ? await issueHostedCheckout(order, hosted) : null;
    log.info(duplicate ? "order.duplicate_submission" : "order.created", {
      number: order.number,
      totalCents: order.totalCents,
      items: order.itemsCount,
      paymentStatus: order.paymentStatus,
    });
    return json(
      {
        ok: true,
        duplicate,
        checkout,
        order: {
          number: order.number,
          token: order.publicToken,
          totalCents: order.totalCents,
          status: order.status,
          paymentStatus: order.paymentStatus,
        },
      },
      duplicate ? 200 : 201,
    );
  } catch (err) {
    if (err instanceof HostedCheckoutError) return errorJson(409, err.message, { code: "hosted_checkout_unavailable" });
    if (err instanceof OrderError) {
      log.warn("order.rejected", { code: err.code, reason: err.message });
      const status = err.code === "closed" ? 403 : 409;
      return errorJson(status, err.message, { code: err.code, details: err.details });
    }
    // Database/validation errors may include submitted PII. Never serialize them here.
    log.error("order.create_failed");
    return errorJson(500, "La réponse n’a pas pu être confirmée. Réessaie avec la même demande pour retrouver ta commande sans la dupliquer.");
  }
}
