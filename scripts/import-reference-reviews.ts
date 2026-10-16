/**
 * Imports the reference-store reviews (scripts/data/reference-reviews.json)
 * into the database of MONGODB_URI. Dry run by default.
 *
 *   npm run reviews:import                       → shows what would change
 *   npm run reviews:import -- --apply            → imports (pending, unpublished)
 *   npm run reviews:import -- --apply --publish-approved --with-photos
 *        → only effective once the manifest records the client's WRITTEN confirmation
 *
 * Idempotent: re-running never duplicates a review and never unpublishes one.
 */
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

import mongoose from "mongoose";
import { canPublish, canUsePhotos, importReferenceReviews, loadManifest } from "./lib/reference-reviews";

async function main() {
  const apply = process.argv.includes("--apply");
  const publishApproved = process.argv.includes("--publish-approved");
  const withPhotos = process.argv.includes("--with-photos");
  const manifest = loadManifest();
  await mongoose.connect(process.env.MONGODB_URI!);
  const db = mongoose.connection.db!;
  console.log(`→ Base : ${db.databaseName} · ${apply ? "ÉCRITURE" : "simulation (ajoute --apply pour écrire)"}`);
  console.log(`  Autorisation client : ${manifest.authorization.status}${canPublish(manifest) ? "" : " → aucun avis ne sera publié"}${canUsePhotos(manifest) ? "" : ", photos non téléchargées"}`);
  const c = await importReferenceReviews(db, manifest, { apply, publishApproved, withPhotos });
  console.log(`  ${c.total} avis dans le relevé : ${c.inserted} à ajouter, ${c.linked} déjà présents (reliés), ${c.unchanged} inchangés`);
  console.log(`  ${c.published} à publier · ${c.photosStored} photos à stocker · ${c.photosAwaitingAuthorization} photos en attente d'autorisation`);
  await mongoose.disconnect();
}

main().catch(async (e) => {
  console.error("✗", e);
  await mongoose.disconnect();
  process.exit(1);
});
