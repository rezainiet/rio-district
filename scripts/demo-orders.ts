/**
 * Creates (or removes) clearly labelled DEMO order requests so the admin
 * screens can be reviewed with data. Orders go through the real API, so
 * pricing, stock and idempotency are exercised exactly as for customers.
 *
 *   npm run demo:orders            → creates 3 demo orders (server must be running)
 *   npm run demo:orders -- --clean → deletes them
 */
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { refuseInProduction } from "./lib/guard";

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const DEMO_EMAIL = /@demo\.kalt\.test$/;

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const db = mongoose.connection.db!;
  const orders = db.collection("orders");

  if (process.argv.includes("--clean")) {
    const res = await orders.deleteMany({ "customer.email": DEMO_EMAIL });
    console.log(`✓ ${res.deletedCount} commande(s) de démonstration supprimée(s)`);
    return;
  }

  refuseInProduction("La création de commandes de démonstration");

  const products = await db.collection("products").find({}, { projection: { slug: 1 } }).toArray();
  const id = (c: string) => String(products.find((p) => p.slug === `veste-bresil-${c}`)!._id);
  const base = { phone: "06 12 34 56 78", address: "12 rue de la Paix", country: "FR" };

  const demos = [
    {
      lines: [{ kind: "bundle", items: [{ productId: id("vert"), size: "M" }, { productId: id("jaune"), size: "L" }], quantity: 1 }],
      customer: { ...base, fullName: "Léa Martin (DÉMO)", email: "lea@demo.kalt.test", postalCode: "75002", city: "Paris", notes: "Commande de démonstration." },
      status: "pending_confirmation",
    },
    {
      lines: [{ kind: "single", productId: id("bleu"), size: "S", quantity: 1 }],
      customer: { ...base, fullName: "Yanis Benali (DÉMO)", email: "yanis@demo.kalt.test", postalCode: "69003", city: "Lyon", notes: "" },
      status: "confirmed",
    },
    {
      lines: [
        { kind: "bundle", items: [{ productId: id("noir"), size: "XL" }, { productId: id("blanc"), size: "XL" }], quantity: 1 },
        { kind: "single", productId: id("rose"), size: "XS", quantity: 1 },
      ],
      customer: { ...base, fullName: "Inès Dupont (DÉMO)", email: "ines@demo.kalt.test", postalCode: "13001", city: "Marseille", notes: "" },
      status: "fulfilled",
    },
  ];

  for (const demo of demos) {
    const res = await fetch(`${BASE}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: BASE },
      body: JSON.stringify({ idempotencyKey: randomUUID(), lines: demo.lines, customer: demo.customer }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`${res.status} ${data.error}`);
    if (demo.status !== "pending_confirmation") {
      const steps = demo.status === "fulfilled" ? ["confirmed", "fulfilled"] : ["confirmed"];
      let from = "pending_confirmation";
      for (const to of steps) {
        await orders.updateOne(
          { number: data.order.number },
          { $set: { status: to }, $push: { history: { at: new Date(), type: "status", from, to, by: "démo" } } as never },
        );
        from = to;
      }
    }
    console.log(`✓ ${data.order.number} — ${demo.customer.fullName} (${demo.status})`);
  }
}

main()
  .catch((err) => {
    console.error("✗", err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
