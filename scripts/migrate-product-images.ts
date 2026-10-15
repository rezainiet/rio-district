/**
 * Points the six initial products at the photographs listed in
 * scripts/data/reference-images.json. Safe and repeatable:
 *
 *   npm run images:migrate              → dry run, prints the plan, writes nothing
 *   npm run images:migrate -- --apply   → updates only `images` (and `color.hex`
 *                                         when the manifest sets swatchHex)
 *   npm run images:migrate -- --revert  → restores the images saved by the last --apply
 *
 * - Products are matched by slug; ids, prices, sizes, stock and orders are untouched.
 * - A product is skipped if any listed file is missing on disk.
 * - A product whose images were already changed by an admin (not placeholders
 *   and not this manifest's files) is skipped unless --force is given, so
 *   re-running never overwrites photos uploaded later through the dashboard.
 * - Every applied change is backed up in the `imagemigrations` collection.
 */
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import mongoose from "mongoose";

type Img = { url: string; alt: string; kind: "photo" | "placeholder" };
type Manifest = {
  authorization: { authorized: boolean };
  targetDir: string;
  products: Record<string, { swatchHex: string | null; images: { file: string; alt: string }[] }>;
};

const APPLY = process.argv.includes("--apply");
const REVERT = process.argv.includes("--revert");
const FORCE = process.argv.includes("--force");

const manifest: Manifest = JSON.parse(readFileSync(path.resolve("scripts/data/reference-images.json"), "utf8"));
const publicPrefix = "/" + path.posix.relative("public", manifest.targetDir.replace(/\\/g, "/"));

const same = (a: Img[], b: Img[]) =>
  a.length === b.length && a.every((x, i) => x.url === b[i].url && x.alt === b[i].alt && x.kind === b[i].kind);

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const db = mongoose.connection.db!;
  const products = db.collection("products");
  const backups = db.collection("imagemigrations");

  if (REVERT) {
    for (const slug of Object.keys(manifest.products)) {
      const last = await backups.findOne({ slug, revertedAt: null }, { sort: { at: -1 } });
      if (!last) {
        console.log(`  = ${slug} : rien à restaurer`);
        continue;
      }
      await products.updateOne(
        { _id: last.productId },
        { $set: { images: last.previousImages, "color.hex": last.previousHex, updatedAt: new Date() } },
      );
      await backups.updateOne({ _id: last._id }, { $set: { revertedAt: new Date() } });
      console.log(`  ↺ ${slug} : ${last.previousImages.length} image(s) restaurée(s)`);
    }
    return;
  }

  if (!manifest.authorization.authorized) {
    console.log("! Autorisation non enregistrée dans le manifeste : simulation uniquement.\n");
  }

  let planned = 0;
  for (const [slug, entry] of Object.entries(manifest.products)) {
    const doc = await products.findOne({ slug });
    if (!doc) {
      console.log(`  ✗ ${slug} : produit introuvable`);
      continue;
    }
    const missing = entry.images.filter((i) => !existsSync(path.resolve(manifest.targetDir, i.file)));
    if (missing.length) {
      console.log(`  ✗ ${slug} : fichier(s) manquant(s) → ${missing.map((m) => m.file).join(", ")}`);
      continue;
    }

    const next: Img[] = entry.images.map((i) => ({ url: `${publicPrefix}/${i.file}`, alt: i.alt, kind: "photo" }));
    const current: Img[] = (doc.images ?? []) as Img[];
    if (same(current, next) && (!entry.swatchHex || doc.color?.hex === entry.swatchHex)) {
      console.log(`  = ${slug} : déjà à jour`);
      continue;
    }
    const customised = current.some((i) => i.kind !== "placeholder" && !i.url.startsWith(publicPrefix + "/"));
    if (customised && !FORCE) {
      console.log(`  ! ${slug} : images personnalisées par l'admin, ignoré (utilise --force pour remplacer)`);
      continue;
    }

    planned++;
    console.log(
      `  ${APPLY ? "→" : "·"} ${slug} : ${current.length} image(s) → ${next.length} photo(s)` +
        (entry.swatchHex && entry.swatchHex !== doc.color?.hex ? `, pastille ${doc.color?.hex} → ${entry.swatchHex}` : ""),
    );
    if (!APPLY) continue;

    await backups.insertOne({
      slug,
      productId: doc._id,
      previousImages: current,
      previousHex: doc.color?.hex ?? null,
      newImages: next,
      at: new Date(),
      revertedAt: null,
    });
    const $set: Record<string, unknown> = { images: next, updatedAt: new Date() };
    if (entry.swatchHex) $set["color.hex"] = entry.swatchHex;
    await products.updateOne({ _id: doc._id }, { $set });
  }

  console.log(
    APPLY ? `\n✓ ${planned} produit(s) mis à jour (sauvegarde dans imagemigrations).` : `\n${planned} produit(s) seraient mis à jour. Relance avec --apply.`,
  );
}

main()
  .catch((err) => {
    console.error("✗", err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
