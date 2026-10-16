/**
 * Production data migration — repeatable, idempotent, non-destructive.
 *
 * Step 1, on a workstation (source = MONGODB_URI, e.g. the local database):
 *   npm run migrate:prod -- export --contact-email support@<domaine> [--out .data/migration/<nom>]
 *     → writes a bundle with ONLY the approved business data:
 *       6 products (same ids, images, variants, prices), categories, store settings
 *       (countdown and every pop-up forced OFF), the reference-review manifest.
 *       Never exported: orders, customers, demo/smoke reviews, contact messages,
 *       admin accounts and sessions, counters, test campaigns.
 *
 * Step 2, on the VPS (target = MONGODB_URI of the production database):
 *   npm run migrate:prod -- import --bundle <dir>                          (dry run: counts only)
 *   npm run migrate:prod -- import --bundle <dir> --apply [--backup <mongodump archive>]
 *     → inserts what is missing, NEVER updates or deletes existing records.
 *       A backup archive (< 24 h) is required as soon as the target already holds data.
 *
 * Rollback of one migration (only what it inserted, refused if orders now use those products):
 *   npm run migrate:prod -- rollback --id <migrationId> [--apply]
 */
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { EJSON, ObjectId } from "bson";
import mongoose from "mongoose";
import type { Db, Document } from "mongodb";
import { DEFAULT_SETTINGS } from "../src/lib/defaults";
import { DEFAULT_COUNTDOWN } from "../src/lib/marketing";
import { settingsSchema } from "../src/lib/validation";
import { importReferenceReviews, loadManifest, manifestChecksum, MANIFEST_PATH, type Manifest } from "./lib/reference-reviews";

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const flag = (name: string) => process.argv.includes(`--${name}`);
const fail = (msg: string): never => {
  console.error(`✗ ${msg}`);
  process.exit(1);
};

type Bundle = {
  format: "rio-district-migration/1";
  createdAt: string;
  sourceDb: string;
  checksum: string;
  products: Document[];
  categories: Document[];
  settings: Record<string, unknown>;
  manifest: Manifest;
  uploads: string[];
  blockers: string[];
};

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || ".data/uploads");
const isDemoEmail = (e: string) => /kaltshop\.club$|example\.(com|invalid)$/i.test(e);

/* ------------------------------------------------------------------ export */

async function exportBundle(db: Db) {
  const out = path.resolve(arg("out") ?? `.data/migration/rio-district-${new Date().toISOString().slice(0, 10)}`);
  const contactEmail = arg("contact-email")?.trim().toLowerCase() ?? null;
  const blockers: string[] = [];

  const products = await db.collection("products").find({}).sort({ sortOrder: 1 }).toArray();
  const categories = await db.collection("categories").find({}).toArray();
  const stored = (await db.collection("settings").findOne({ key: "store" }))?.data ?? {};
  if (products.length !== 6) blockers.push(`${products.length} produits trouvés (6 attendus).`);

  // Every image must be served by our application: no reference-site URLs.
  const uploads: string[] = [];
  for (const p of products) {
    if (p.status !== "active") blockers.push(`Produit ${p.slug} : statut ${p.status}.`);
    for (const img of p.images ?? []) {
      const url = String(img.url);
      if (/^https?:\/\//.test(url)) blockers.push(`Image distante sur ${p.slug} : ${url}`);
      else if (url.startsWith("/uploads/")) uploads.push(url);
      else if (!existsSync(path.join("public", url))) blockers.push(`Image manquante dans public/ : ${url}`);
    }
  }

  // Settings: approved values only. Campaigns are forced OFF; the contact e-mail must be the client's.
  const settings = settingsSchema.parse({ ...DEFAULT_SETTINGS, ...stored }) as Record<string, unknown>;
  const popups = structuredClone((stored.popups ?? DEFAULT_SETTINGS.popups) as typeof DEFAULT_SETTINGS.popups);
  for (const p of Object.values(popups)) p.enabled = false;
  for (const [k, p] of Object.entries(popups)) {
    if (/d[ée]mo/i.test(`${p.title} ${p.text}`)) Object.assign(p, DEFAULT_SETTINGS.popups[k as keyof typeof popups], { enabled: false });
  }
  settings.popups = popups;
  settings.countdown = DEFAULT_COUNTDOWN; // no real deadline supplied: configured empty and OFF
  if (!contactEmail) blockers.push("E-mail de contact Rio District non fourni (--contact-email).");
  else if (isDemoEmail(contactEmail)) blockers.push(`E-mail de contact refusé : ${contactEmail} (ancienne boutique ou exemple).`);
  settings.contactEmail = contactEmail;

  const textBlob = JSON.stringify({ settings, products: products.map((p) => [p.name, p.tagline, p.description]) });
  if (/d[ée]mo|lorem|smoke/i.test(textBlob)) blockers.push("Contenu de démonstration détecté dans les produits ou réglages exportés.");

  mkdirSync(path.join(out, "uploads"), { recursive: true });
  for (const url of uploads) {
    const src = path.join(UPLOAD_DIR, path.basename(url));
    if (!existsSync(src)) blockers.push(`Fichier téléversé introuvable : ${src}`);
    else copyFileSync(src, path.join(out, "uploads", path.basename(url)));
  }

  const manifest = loadManifest();
  const body = { products, categories, settings, manifest, uploads };
  const bundle: Bundle = {
    format: "rio-district-migration/1",
    createdAt: new Date().toISOString(),
    sourceDb: db.databaseName,
    checksum: createHash("sha256").update(EJSON.stringify(body)).digest("hex").slice(0, 16),
    ...body,
    blockers,
  };
  writeFileSync(path.join(out, "bundle.json"), EJSON.stringify(bundle, undefined, 2, { relaxed: false }));
  console.log(`✓ Export : ${out}`);
  console.log(`  ${products.length} produits · ${categories.length} catégories · 1 document de réglages · ${manifest.reviews.length} avis de référence (manifeste ${manifestChecksum(MANIFEST_PATH)}) · ${uploads.length} fichiers téléversés`);
  console.log("  Exclus : commandes, clients, messages, avis de test/démo, comptes admin, sessions, compteurs, campagnes de test.");
  if (blockers.length) {
    console.log(`  ⚠ ${blockers.length} bloquant(s) — l'import refusera --apply :`);
    for (const b of blockers) console.log(`    - ${b}`);
  }
}

/* ------------------------------------------------------------------ import */

function readBundle(dir: string): Bundle {
  const file = path.join(path.resolve(dir), "bundle.json");
  if (!existsSync(file)) fail(`Bundle introuvable : ${file}`);
  const b = EJSON.parse(readFileSync(file, "utf8"), { relaxed: false }) as Bundle;
  if (b.format !== "rio-district-migration/1") fail("Format de bundle inconnu.");
  const body = { products: b.products, categories: b.categories, settings: b.settings, manifest: b.manifest, uploads: b.uploads };
  if (createHash("sha256").update(EJSON.stringify(body)).digest("hex").slice(0, 16) !== b.checksum) fail("Somme de contrôle invalide : bundle modifié ou corrompu.");
  return b;
}

async function importBundle(db: Db) {
  const dir = arg("bundle") ?? fail("--bundle <dossier> requis.");
  const apply = flag("apply");
  const b = readBundle(dir);
  if (/_demo$|test/i.test(db.databaseName)) fail(`Base cible suspecte : ${db.databaseName}.`);

  const existing = {
    products: await db.collection("products").countDocuments(),
    orders: await db.collection("orders").countDocuments(),
    testimonials: await db.collection("testimonials").countDocuments(),
    settings: await db.collection("settings").countDocuments(),
  };
  const hasData = Object.values(existing).some((n) => n > 0);
  console.log(`→ Cible : ${db.databaseName} · ${apply ? "ÉCRITURE" : "simulation (ajoute --apply pour écrire)"}`);
  console.log(`  Bundle ${b.checksum} du ${b.createdAt} (source : ${b.sourceDb})`);
  console.log(`  Contenu actuel : ${existing.products} produits, ${existing.orders} commandes, ${existing.testimonials} avis, ${existing.settings} réglages`);

  if (apply) {
    if (b.blockers.length) fail(`Bundle avec ${b.blockers.length} bloquant(s) :\n    - ${b.blockers.join("\n    - ")}\n  Corrige-les puis relance l'export.`);
    if (hasData) {
      const backup = arg("backup") ?? fail("La base contient déjà des données : --backup <archive mongodump de moins de 24 h> est obligatoire.");
      if (!existsSync(backup) || statSync(backup).size === 0) fail(`Sauvegarde introuvable ou vide : ${backup}`);
      if (Date.now() - statSync(backup).mtimeMs > 24 * 3_600_000) fail("Sauvegarde de plus de 24 h : refais un mongodump.");
      console.log(`  Sauvegarde vérifiée : ${backup}`);
    }
  }

  const migrationId = `mig-${new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14)}-${b.checksum.slice(0, 6)}`;
  const inserted = { products: [] as ObjectId[], categories: [] as ObjectId[], settings: false };
  const plan = { products: { insert: 0, keep: 0 }, categories: { insert: 0, keep: 0 }, settings: "" };

  for (const [name, docs] of [["categories", b.categories], ["products", b.products]] as const) {
    const col = db.collection(name);
    for (const doc of docs) {
      const bySlug = await col.findOne({ slug: doc.slug });
      const byId = await col.findOne({ _id: doc._id });
      if (bySlug || byId) {
        if (byId && byId.slug !== doc.slug) fail(`${name} : l'identifiant ${doc._id} existe déjà avec un autre slug (${byId.slug}).`);
        plan[name].keep++;
        continue; // never overwrite real production data
      }
      plan[name].insert++;
      if (apply) {
        await col.insertOne(doc);
        inserted[name].push(doc._id as ObjectId);
      }
    }
  }

  const settings = await db.collection("settings").findOne({ key: "store" });
  plan.settings = settings ? "conservés (déjà présents)" : "à créer";
  if (!settings && apply) {
    const now = new Date();
    await db.collection("settings").insertOne({ key: "store", data: b.settings, createdAt: now, updatedAt: now });
    inserted.settings = true;
  }

  // Product image uploads into the persistent UPLOAD_DIR (never overwritten).
  let files = 0;
  for (const url of b.uploads) {
    const dest = path.join(UPLOAD_DIR, path.basename(url));
    if (existsSync(dest)) continue;
    files++;
    if (apply) {
      mkdirSync(UPLOAD_DIR, { recursive: true });
      copyFileSync(path.join(path.resolve(dir), "uploads", path.basename(url)), dest);
    }
  }

  const reviews = await importReferenceReviews(db, b.manifest, {
    apply,
    publishApproved: flag("publish-approved"),
    withPhotos: flag("with-photos"),
    uploadDir: UPLOAD_DIR,
    migration: migrationId,
  });

  console.log(`  Produits : ${plan.products.insert} à insérer, ${plan.products.keep} déjà présents (non modifiés)`);
  console.log(`  Catégories : ${plan.categories.insert} à insérer, ${plan.categories.keep} déjà présentes`);
  console.log(`  Réglages : ${plan.settings} (compte à rebours et pop-ups désactivés)`);
  console.log(`  Fichiers téléversés : ${files} à copier dans ${UPLOAD_DIR}`);
  console.log(`  Avis de référence : ${reviews.inserted} à insérer (non publiés), ${reviews.linked + reviews.unchanged} déjà présents, ${reviews.published} à publier, ${reviews.photosAwaitingAuthorization} photos en attente d'autorisation`);

  if (apply) {
    await db.collection("migrations").insertOne({
      _id: migrationId as unknown as ObjectId,
      at: new Date(),
      bundle: b.checksum,
      inserted: { ...inserted, reviewsTag: migrationId },
    });
    console.log(`✓ Migration ${migrationId} appliquée. Retour arrière : npm run migrate:prod -- rollback --id ${migrationId}`);
  }
}

/* ---------------------------------------------------------------- rollback */

async function rollback(db: Db) {
  const id = arg("id") ?? fail("--id <migrationId> requis.");
  const apply = flag("apply");
  const log = await db.collection("migrations").findOne({ _id: id as unknown as ObjectId });
  if (!log) fail(`Migration ${id} introuvable.`);
  const products: ObjectId[] = log!.inserted.products ?? [];
  const used = await db.collection("orders").countDocuments({ "lines.items.product": { $in: products } });
  if (used) fail(`${used} commande(s) utilisent ces produits : retour arrière refusé (restaure plutôt la sauvegarde).`);
  // Only reviews still untouched since the import (not moderated, not published).
  const reviewFilter = { migration: id, published: false, moderatedAt: null };
  const counts = {
    products: products.length,
    categories: (log!.inserted.categories ?? []).length,
    reviews: await db.collection("testimonials").countDocuments(reviewFilter),
    settings: log!.inserted.settings ? 1 : 0,
  };
  console.log(`→ Retour arrière ${id} · ${apply ? "ÉCRITURE" : "simulation (ajoute --apply)"} : ${JSON.stringify(counts)}`);
  if (!apply) return;
  await db.collection("products").deleteMany({ _id: { $in: products } });
  await db.collection("categories").deleteMany({ _id: { $in: log!.inserted.categories ?? [] } });
  await db.collection("testimonials").deleteMany(reviewFilter);
  if (log!.inserted.settings) await db.collection("settings").deleteOne({ key: "store", updatedAt: { $lte: log!.at } });
  await db.collection("migrations").updateOne({ _id: id as unknown as ObjectId }, { $set: { rolledBackAt: new Date() } });
  console.log("✓ Retour arrière effectué (seuls les éléments insérés par cette migration et non modifiés depuis).");
}

async function main() {
  const cmd = process.argv[2];
  if (!["export", "import", "rollback"].includes(cmd)) fail("Usage : migrate:prod -- export | import | rollback (voir l'en-tête du script).");
  await mongoose.connect(process.env.MONGODB_URI ?? fail("MONGODB_URI manquant."));
  const db = mongoose.connection.db!;
  try {
    if (cmd === "export") await exportBundle(db);
    if (cmd === "import") await importBundle(db);
    if (cmd === "rollback") await rollback(db);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch(async (e) => {
  console.error("✗", e);
  await mongoose.disconnect();
  process.exit(1);
});
