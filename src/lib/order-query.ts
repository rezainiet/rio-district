import "server-only";
import type { QueryFilter } from "mongoose";
import { ORDER_STATUSES, PAYMENT_STATUSES, type OrderDoc, type OrderStatus, type PaymentStatus } from "@/models/Order";

export type OrderFilters = { q?: string; status?: string; payment?: string; from?: string; to?: string };

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function readFilters(sp: Record<string, string | string[] | undefined>): OrderFilters {
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string).trim() : undefined);
  return { q: one("q"), status: one("status"), payment: one("payment"), from: one("from"), to: one("to") };
}

export function buildOrderQuery(f: OrderFilters): QueryFilter<OrderDoc> {
  const query: QueryFilter<OrderDoc> = {};
  if (f.status && (ORDER_STATUSES as readonly string[]).includes(f.status)) query.status = f.status as OrderStatus;
  if (f.payment && (PAYMENT_STATUSES as readonly string[]).includes(f.payment)) query.paymentStatus = f.payment as PaymentStatus;
  if (f.q) {
    const rx = new RegExp(escapeRegex(f.q.slice(0, 80)), "i");
    query.$or = [
      { number: rx },
      { "customer.fullName": rx },
      { "customer.email": rx },
      { "customer.phone": rx },
      { "shipping.city": rx },
      { "shipping.postalCode": rx },
    ];
  }
  const range: Record<string, Date> = {};
  if (f.from && !Number.isNaN(Date.parse(f.from))) range.$gte = new Date(f.from);
  if (f.to && !Number.isNaN(Date.parse(f.to))) range.$lte = new Date(`${f.to}T23:59:59.999Z`);
  if (Object.keys(range).length) query.createdAt = range;
  return query;
}
