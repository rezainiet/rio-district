import { z } from "zod";
import { isValidObjectId } from "mongoose";
import { adminRoute, errorJson, json } from "@/lib/http";
import { addInternalNote, OrderError, updateOrderStatus, updatePaymentStatus } from "@/lib/orders";
import { ORDER_STATUSES, PAYMENT_STATUSES } from "@/models/Order";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("status"), status: z.enum(ORDER_STATUSES), message: z.string().trim().max(300).optional() }),
  z.object({ action: z.literal("payment"), paymentStatus: z.enum(PAYMENT_STATUSES), message: z.string().trim().max(300).optional() }),
  z.object({ action: z.literal("note"), text: z.string().trim().min(1).max(2000) }),
]);

export const PATCH = adminRoute<RouteContext<"/api/admin/orders/[id]">>(async (req, ctx, admin) => {
  const { id } = await ctx.params;
  if (!isValidObjectId(id)) return errorJson(404, "Commande introuvable.");
  const body = schema.parse(await req.json());
  try {
    if (body.action === "status") await updateOrderStatus(id, body.status, admin.email, body.message);
    else if (body.action === "payment") await updatePaymentStatus(id, body.paymentStatus, admin.email, body.message);
    else await addInternalNote(id, admin.email, body.text);
    return json({ ok: true });
  } catch (err) {
    if (err instanceof OrderError) return errorJson(err.code === "not_found" ? 404 : 409, err.message);
    throw err;
  }
});
