import type { NextRequest } from "next/server";
import { orderRequestSchema } from "@/lib/validation";
import { clientIp, errorJson, json, parseBody, rateLimit, sameOrigin } from "@/lib/http";
import { createOrderRequest, OrderError } from "@/lib/orders";

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
    const { order, duplicate } = await createOrderRequest(body.data, {
      ip,
      userAgent: req.headers.get("user-agent") ?? undefined,
    });
    return json(
      {
        ok: true,
        duplicate,
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
    if (err instanceof OrderError) {
      const status = err.code === "closed" ? 403 : 409;
      return errorJson(status, err.message, { code: err.code, details: err.details });
    }
    console.error("[orders]", err);
    return errorJson(500, "Une erreur est survenue. Ta demande n'a pas été enregistrée, réessaie.");
  }
}
