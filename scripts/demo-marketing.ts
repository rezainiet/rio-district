/**
 * Builds a SEPARATE demo database (…_demo) to preview reviews, the countdown
 * and pop-ups without touching real data. Everything written is labelled
 * "Démo" and must never be copied to production.
 *
 *   npx tsx scripts/demo-marketing.ts            → copies the catalogue into <db>_demo + demo content
 *   npx tsx scripts/demo-marketing.ts --clean    → drops <db>_demo and its demo photos
 *
 * Then run the dev server against it:
 *   MONGODB_URI=mongodb://127.0.0.1:27017/kalt_demo npm run dev
 */
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

import { readFile, unlink } from "node:fs/promises";
import path from "node:path";
import mongoose from "mongoose";
import { refuseInProduction } from "./lib/guard";

const COPY = ["products", "categories", "settings", "adminusers", "orders", "counters"];

async function main() {
  refuseInProduction("La base de démonstration");
  const source = new URL(process.env.MONGODB_URI!);
  const sourceDb = source.pathname.slice(1) || "test";
  if (sourceDb.endsWith("_demo")) throw new Error("MONGODB_URI pointe déjà vers une base de démo.");
  const demoDb = `${sourceDb}_demo`;
  const conn = await mongoose.connect(process.env.MONGODB_URI!);
  const src = conn.connection.db!;
  const dst = conn.connection.getClient().db(demoDb);
  // Same folder as src/lib/review-photos.ts (not imported: it is server-only).
  const REVIEW_PHOTO_DIR = path.resolve(process.env.UPLOAD_DIR || ".data/uploads", "reviews");

  // Remove the previous demo photos (only those referenced by the demo DB).
  const previous = await dst.collection("testimonials").find({}, { projection: { photos: 1 } }).toArray().catch(() => []);
  for (const r of previous) for (const url of (r.photos as string[]) ?? []) await unlink(path.join(REVIEW_PHOTO_DIR, path.basename(url))).catch(() => {});
  await dst.dropDatabase();
  if (process.argv.includes("--clean")) {
    console.log(`✓ Base ${demoDb} supprimée.`);
    await mongoose.disconnect();
    return;
  }

  for (const name of COPY) {
    const docs = await src.collection(name).find().toArray();
    if (docs.length) await dst.collection(name).insertMany(docs);
  }
  const products = await dst.collection("products").find({}, { projection: { slug: 1, images: 1 } }).toArray();
  const bySlug = (c: string) => products.find((p) => p.slug === `veste-bresil-${c}`)!;
  const fulfilled = await dst.collection("orders").findOne({ status: "fulfilled" });

  // One demo "customer photo", re-encoded like real submissions.
  const sharp = (await import("sharp")).default;
  const { mkdir, writeFile } = await import("node:fs/promises");
  await mkdir(REVIEW_PHOTO_DIR, { recursive: true });
  const photoName = `dm${Date.now().toString(36).slice(-4)}-${"d".repeat(12)}.webp`;
  const srcImage = path.join("public", (bySlug("jaune").images[0].url as string).replace(/^\//, ""));
  await writeFile(path.join(REVIEW_PHOTO_DIR, photoName), await sharp(await readFile(srcImage)).resize(900).webp({ quality: 80 }).toBuffer());

  const day = 86_400_000;
  const review = (i: number, color: string, rating: number, author: string, title: string, text: string, extra: Record<string, unknown> = {}) => ({
    author,
    title: `[Démo] ${title}`,
    text,
    rating,
    verified: false,
    published: true,
    status: "approved",
    source: "Contenu de démonstration — ne pas publier",
    submittedBy: "customer",
    product: bySlug(color)._id,
    email: `demo${i}@example.invalid`,
    order: null,
    orderNumber: "",
    photos: [],
    moderatedAt: new Date(),
    moderatedBy: "demo",
    sortOrder: 0,
    createdAt: new Date(Date.now() - (i + 1) * 3 * day),
    updatedAt: new Date(),
    ...extra,
  });
  await dst.collection("testimonials").insertMany([
    review(0, "vert", 5, "Lina Robert", "Coupe ample, très légère", "Avis de démonstration. Je fais 1m68 et j'ai pris un M : la coupe est ample comme annoncé, parfaite par-dessus un sweat.", fulfilled ? { verified: true, order: fulfilled._id, orderNumber: fulfilled.number } : {}),
    review(1, "jaune", 5, "Mehdi Bensaïd", "Le jaune est encore plus beau en vrai", "Avis de démonstration. Couleur éclatante, zip solide, je l'ai portée sous une petite pluie sans souci.", { photos: [`/uploads/reviews/${photoName}`] }),
    review(2, "noir", 4, "Camille Petit", "Très bien, taille un peu grand", "Avis de démonstration. Belle finition. J'aurais pu prendre une taille en dessous, le guide l'indiquait d'ailleurs.", {}),
    review(3, "rose", 5, "Sarah", "Pack parfait pour deux", "Avis de démonstration. Pris en pack avec ma sœur, une rose et une blanche. Livraison rapide.", {}),
    review(4, "bleu", 4, "Yanis Morel", "Légère et pratique", "Avis de démonstration. Idéale pour la mi-saison, se range facilement dans un sac.", {}),
    review(5, "blanc", 3, "Julie Martin", "Jolie mais salissante", "Avis de démonstration. Le blanc est superbe mais demande de l'entretien.", {}),
    review(6, "vert", 5, "Thomas Leroy", "Exactement comme sur les photos", "Avis de démonstration. Rien à redire, conforme aux photos et à la description.", {}),
    { ...review(7, "noir", 2, "Demo Pending", "En attente de modération", "Avis de démonstration en attente : il ne doit pas apparaître sur la boutique.", {}), published: false, status: "pending", moderatedAt: null, moderatedBy: "" },
  ]);

  const now = Date.now();
  const noirImg = bySlug("noir").images[0].url as string;
  const blancImg = bySlug("blanc").images[0].url as string;
  await dst.collection("settings").updateOne(
    { key: "store" },
    {
      $set: {
        "data.countdown": {
          enabled: true,
          title: "Démo — Offre de lancement",
          text: "Campagne de démonstration : aucune offre réelle n'est en cours.",
          ctaLabel: "Composer mon pack",
          ctaHref: "/produit/veste-bresil-noir?offre=pack#acheter",
          startsAt: null,
          endsAt: new Date(now + 3 * day + 5 * 3_600_000 + 17 * 60_000).toISOString(),
          placement: { home: true, product: true },
        },
        "data.popups": {
          welcome: {
            enabled: true,
            title: "Démo — Bienvenue",
            text: "Contenu de démonstration. Six coloris, une coupe : découvre la collection Brésil.",
            ctaLabel: "Voir la collection",
            ctaHref: "/#collection",
            imageUrl: noirImg,
            frequencyDays: 30,
            startsAt: null,
            endsAt: null,
            delaySeconds: 5,
          },
          exitIntent: {
            enabled: true,
            title: "Démo — Avant de partir",
            text: "Contenu de démonstration. Le pack 2 vestes reste à 24,95 € : compose-le avec les couleurs de ton choix.",
            ctaLabel: "Composer mon pack",
            ctaHref: "/produit/veste-bresil-blanc?offre=pack#acheter",
            imageUrl: blancImg,
            frequencyDays: 14,
            startsAt: null,
            endsAt: null,
            minSecondsOnPage: 5,
          },
          cartReminder: {
            enabled: true,
            title: "Démo — Ton panier t'attend",
            text: "Contenu de démonstration. Tes articles sont toujours dans ton panier.",
            frequencyDays: 3,
            startsAt: null,
            endsAt: null,
            delaySeconds: 3,
          },
        },
      },
    },
  );
  console.log(`✓ Base ${demoDb} prête (catalogue copié, 7 avis publiés + 1 en attente, campagne et pop-ups de démo).`);
  console.log(`  MONGODB_URI=${source.protocol}//${source.host}/${demoDb} npm run dev`);
  await mongoose.disconnect();
}

main().catch(async (e) => {
  console.error("✗", e);
  await mongoose.disconnect();
  process.exit(1);
});
