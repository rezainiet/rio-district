import { z } from "zod";
import { adminRoute, errorJson, json, parseBody } from "@/lib/http";
import { HostedCheckoutError } from "@/lib/payments/everflow";
import { setForwardingFlag } from "@/lib/payments/forwarding-flag";
import { log } from "@/lib/log";

const schema = z.object({ enabled: z.boolean() });

export const PUT = adminRoute(async (req, _ctx, admin) => {
  if (admin.role !== "owner") return errorJson(403, "Accès réservé au propriétaire.");
  const body = await parseBody(req, schema);
  if (!body.ok) return body.response;
  try {
    const flag = setForwardingFlag(body.data.enabled);
    log.info("admin.payment_forwarding_changed", { by: admin.email, enabled: flag.enabled });
    return json({ ok: true, enabled: flag.enabled });
  } catch (error) {
    if (error instanceof HostedCheckoutError) return errorJson(409, error.message);
    throw error;
  }
});
