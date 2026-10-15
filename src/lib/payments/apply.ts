import "server-only";
import { connectDB } from "../db";
import type { PaymentEvent } from "./index";
import { Order } from "@/models/Order";
import { PaymentAttempt } from "@/models/misc";

const toPaymentStatus = {
  succeeded: "paid",
  failed: "failed",
  cancelled: "unpaid",
  pending: "pending",
  refunded: "refunded",
} as const;

/**
 * Applies a VERIFIED provider event to the matching attempt and order.
 * Idempotent: replaying the same event leaves the order unchanged.
 * Refuses to mark an order paid when the amount doesn't match its total.
 */
export async function applyPaymentEvent(event: PaymentEvent) {
  await connectDB();
  const attempt = await PaymentAttempt.findOne({ provider: event.provider, providerRef: event.providerRef });
  if (!attempt) throw new Error("Tentative de paiement inconnue.");

  const order = await Order.findById(attempt.order);
  if (!order) throw new Error("Commande introuvable.");

  if (event.type === "succeeded" && (event.amountCents !== order.totalCents || event.currency !== order.currency)) {
    throw new Error("Montant du paiement différent du total de la commande.");
  }

  attempt.status = event.type === "refunded" ? "succeeded" : event.type === "succeeded" ? "succeeded" : event.type;
  attempt.raw = event.raw;
  await attempt.save();

  const to = toPaymentStatus[event.type];
  if (order.paymentStatus === to) return order;
  order.history.push({ type: "payment", from: order.paymentStatus, to, by: event.provider });
  order.paymentStatus = to;
  if (to === "paid") order.set("payment.paidAt", new Date());
  await order.save();
  return order;
}
