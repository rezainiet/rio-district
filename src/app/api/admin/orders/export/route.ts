import { adminRoute } from "@/lib/http";
import { connectDB } from "@/lib/db";
import { buildOrderQuery, readFilters } from "@/lib/order-query";
import { ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL } from "@/lib/labels";
import { Order, type OrderDoc } from "@/models/Order";

/** Excel-friendly CSV (UTF-8 BOM, semicolon separator as used in France). */
function cell(v: unknown) {
  let s = v === null || v === undefined ? "" : String(v);
  // Neutralise spreadsheet formula injection.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

const euros = (c: number) => (c / 100).toFixed(2).replace(".", ",");

export const GET = adminRoute(async (req) => {
  await connectDB();
  const filters = readFilters(Object.fromEntries(req.nextUrl.searchParams));
  const orders = await Order.find(buildOrderQuery(filters)).sort({ createdAt: -1 }).limit(10000).lean<OrderDoc[]>();

  const header = [
    "Numéro", "Date", "Statut", "Paiement", "Nom", "E-mail", "Téléphone", "Adresse", "Complément",
    "Code postal", "Ville", "Pays", "Articles", "Nb articles", "Sous-total €", "Remise €", "Livraison €", "Total €", "Note client",
  ];
  const rows = orders.map((o) => [
    o.number,
    new Date(o.createdAt as Date).toISOString(),
    ORDER_STATUS_LABEL[o.status] ?? o.status,
    PAYMENT_STATUS_LABEL[o.paymentStatus] ?? o.paymentStatus,
    o.customer.fullName,
    o.customer.email,
    o.customer.phone,
    o.shipping.address,
    o.shipping.address2,
    o.shipping.postalCode,
    o.shipping.city,
    o.shipping.country,
    o.lines
      .map((l) => `${l.kind === "bundle" ? "Pack: " : ""}${l.items.map((i) => `${i.name} ${i.size}`).join(" + ")} x${l.quantity}`)
      .join(" | "),
    o.itemsCount,
    euros(o.subtotalCents),
    euros(o.discountCents),
    euros(o.shippingCents),
    euros(o.totalCents),
    o.customerNote,
  ]);

  const csv = "﻿" + [header, ...rows].map((r) => r.map(cell).join(";")).join("\r\n");
  const date = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="commandes-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
});
