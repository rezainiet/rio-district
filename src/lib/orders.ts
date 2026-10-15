import "server-only";
import { randomBytes } from "node:crypto";
import { connectDB } from "./db";
import { getProductMap, getSettings } from "./catalog";
import { priceCart, stockRequirements } from "./pricing";
import type { CartLineInput, CartQuote } from "./types";
import type { z } from "zod";
import type { orderRequestSchema } from "./validation";
import { Order, type OrderDoc, type OrderStatus, type PaymentStatus } from "@/models/Order";
import { Product } from "@/models/Product";
import { Counter } from "@/models/misc";

export class OrderError extends Error {
  constructor(
    public code: "closed" | "invalid_cart" | "out_of_stock" | "not_found" | "invalid_transition",
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

/** Server-authoritative quote: prices always come from MongoDB. */
export async function quoteCart(lines: CartLineInput[]): Promise<CartQuote> {
  const ids = lines.flatMap((l) => (l.kind === "single" ? [l.productId] : l.items.map((i) => i.productId)));
  const [products, settings] = await Promise.all([getProductMap(ids), getSettings()]);
  return priceCart(lines, products, settings.bundle, settings.shipping.priceCents);
}

type Reservation = { productId: string; size: string; qty: number };

/**
 * Decrements tracked stock atomically, one product/size at a time. The filter
 * only matches when enough units remain, so concurrent orders cannot oversell.
 * Sizes whose stock is null are untracked and always pass.
 */
async function reserveStock(needs: Reservation[]) {
  const done: Reservation[] = [];
  try {
    for (const need of needs) {
      const res = await Product.updateOne(
        {
          _id: need.productId,
          sizes: { $elemMatch: { label: need.size, enabled: true, stock: { $type: "number", $gte: need.qty } } },
        },
        { $inc: { "sizes.$[s].stock": -need.qty } },
        { arrayFilters: [{ "s.label": need.size }] },
      );
      if (res.modifiedCount === 1) {
        done.push(need);
        continue;
      }
      const untracked = await Product.exists({
        _id: need.productId,
        sizes: { $elemMatch: { label: need.size, enabled: true, stock: null } },
      });
      if (!untracked) {
        throw new OrderError("out_of_stock", `Stock insuffisant pour la taille ${need.size}.`, need);
      }
    }
    return done;
  } catch (err) {
    await releaseStock(done);
    throw err;
  }
}

async function releaseStock(items: Reservation[]) {
  for (const item of items) {
    await Product.updateOne(
      { _id: item.productId, sizes: { $elemMatch: { label: item.size, stock: { $type: "number" } } } },
      { $inc: { "sizes.$[s].stock": item.qty } },
      { arrayFilters: [{ "s.label": item.size }] },
    );
  }
}

async function nextOrderNumber() {
  const counter = await Counter.findOneAndUpdate(
    { _id: "order" },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );
  return `KALT-${String(10000 + counter.seq)}`;
}

export type OrderRequest = z.output<typeof orderRequestSchema>;

export async function createOrderRequest(input: OrderRequest, meta: { ip?: string; userAgent?: string }) {
  await connectDB();

  // Idempotency: a retried submission returns the order created the first time.
  const existing = await Order.findOne({ idempotencyKey: input.idempotencyKey }).lean<OrderDoc>();
  if (existing) return { order: existing, duplicate: true };

  const settings = await getSettings();
  if (!settings.orders.acceptingOrders) {
    throw new OrderError("closed", settings.orders.closedMessage);
  }

  const quote = await quoteCart(input.lines);
  if (quote.errors.length > 0 || quote.lines.length === 0) {
    throw new OrderError("invalid_cart", quote.errors[0]?.message ?? "Panier invalide.", quote.errors);
  }

  const needs = stockRequirements(quote.lines);
  const reserved = await reserveStock(needs);

  try {
    const c = input.customer;
    const order = await Order.create({
      number: await nextOrderNumber(),
      publicToken: randomBytes(18).toString("base64url"),
      idempotencyKey: input.idempotencyKey,
      customer: { fullName: c.fullName, email: c.email, phone: c.phone },
      shipping: {
        address: c.address,
        address2: c.address2 ?? "",
        postalCode: c.postalCode,
        city: c.city,
        country: c.country,
      },
      customerNote: c.notes ?? "",
      lines: quote.lines.map((l) => ({
        kind: l.kind,
        label: l.label,
        items: l.items.map((i) => ({
          product: i.productId,
          slug: i.slug,
          name: i.name,
          color: i.color,
          size: i.size,
          image: i.image,
          unitPriceCents: i.unitPriceCents,
        })),
        quantity: l.quantity,
        unitPriceCents: l.unitPriceCents,
        compareAtCents: l.compareAtCents,
        totalCents: l.totalCents,
      })),
      itemsCount: quote.itemsCount,
      subtotalCents: quote.subtotalCents,
      discountCents: quote.discountCents,
      shippingCents: quote.shippingCents,
      totalCents: quote.totalCents,
      status: "pending_confirmation",
      paymentStatus: "awaiting_payment_setup",
      stockReserved: reserved.length > 0,
      history: [{ type: "created", to: "pending_confirmation", by: "client", message: "Demande de commande reçue (non payée)." }],
      meta: { ip: meta.ip, userAgent: meta.userAgent?.slice(0, 300) },
    });
    return { order: order.toObject() as OrderDoc, duplicate: false };
  } catch (err) {
    await releaseStock(reserved);
    // Two identical submissions raced: return the one that won.
    if ((err as { code?: number }).code === 11000) {
      const winner = await Order.findOne({ idempotencyKey: input.idempotencyKey }).lean<OrderDoc>();
      if (winner) return { order: winner, duplicate: true };
    }
    throw err;
  }
}

/* ---------- Admin transitions ---------- */

const ALLOWED: Record<OrderStatus, OrderStatus[]> = {
  pending_confirmation: ["confirmed", "cancelled"],
  confirmed: ["fulfilled", "cancelled", "pending_confirmation"],
  fulfilled: ["confirmed"],
  cancelled: [],
};

export function allowedNextStatuses(status: OrderStatus) {
  return ALLOWED[status];
}

export async function updateOrderStatus(id: string, to: OrderStatus, by: string, message?: string) {
  await connectDB();
  const order = await Order.findById(id);
  if (!order) throw new OrderError("not_found", "Commande introuvable.");
  const from = order.status as OrderStatus;
  if (!ALLOWED[from].includes(to)) {
    throw new OrderError("invalid_transition", `Transition impossible : ${from} → ${to}.`);
  }

  // Conditional update guards against two admins acting at the same time.
  const updated = await Order.findOneAndUpdate(
    { _id: id, status: from },
    {
      $set: { status: to, ...(to === "cancelled" ? { stockReserved: false } : {}) },
      $push: { history: { type: to === "cancelled" ? "cancelled" : "status", from, to, by, message } },
    },
    { returnDocument: "after" },
  );
  if (!updated) throw new OrderError("invalid_transition", "La commande a été modifiée entre-temps. Recharge la page.");

  if (to === "cancelled" && order.stockReserved) {
    const needs = order.lines.flatMap((l) =>
      l.items.map((i) => ({ productId: String(i.product), size: String(i.size), qty: l.quantity })),
    );
    await releaseStock(needs);
  }
  return updated;
}

export async function updatePaymentStatus(id: string, to: PaymentStatus, by: string, message?: string) {
  await connectDB();
  const order = await Order.findById(id);
  if (!order) throw new OrderError("not_found", "Commande introuvable.");
  const from = order.paymentStatus;
  order.paymentStatus = to;
  if (to === "paid" && !order.payment?.paidAt) order.set("payment.paidAt", new Date());
  if (to !== "paid") order.set("payment.paidAt", null);
  order.history.push({ type: "payment", from, to, by, message });
  await order.save();
  return order;
}

export async function addInternalNote(id: string, author: string, text: string) {
  await connectDB();
  const res = await Order.findByIdAndUpdate(
    id,
    {
      $push: {
        internalNotes: { author, text },
        history: { type: "note", by: author, message: text.slice(0, 140) },
      },
    },
    { returnDocument: "after" },
  );
  if (!res) throw new OrderError("not_found", "Commande introuvable.");
  return res;
}
