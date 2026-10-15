/**
 * Seeds the database with the initial catalogue, store settings, the
 * (unpublished) testimonials taken from the reference, and an admin account.
 *
 *   npm run seed            → inserts what is missing, never overwrites
 *   npm run seed -- --reset → also overwrites the 6 initial products & settings
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();

import path from "node:path";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { writePlaceholders, type Swatch } from "./placeholders";
import { Product } from "../src/models/Product";
import { Category } from "../src/models/Category";
import { AdminUser, Settings, Testimonial } from "../src/models/misc";
import { DEFAULT_SETTINGS } from "../src/lib/defaults";
import { SIZES } from "../src/lib/sizes";

const RESET = process.argv.includes("--reset");

const COLORS: { slug: string; name: string; hex: string; swatch: Swatch }[] = [
  { slug: "vert", name: "Vert", hex: "#1E6B45", swatch: { body: "#1E6B45", shade: "#154F33", trim: "#F2C824", trim2: "#FFFFFF", zip: "#0F2E1F", light: false } },
  { slug: "rose", name: "Rose", hex: "#EBA6BE", swatch: { body: "#EBA6BE", shade: "#D98BA6", trim: "#1E6B45", trim2: "#FFFFFF", zip: "#7A3E55", light: true } },
  { slug: "noir", name: "Noir", hex: "#1B1B1B", swatch: { body: "#1F1F1F", shade: "#121212", trim: "#F2C824", trim2: "#1E8A55", zip: "#000000", light: false } },
  { slug: "blanc", name: "Blanc", hex: "#F1F0EA", swatch: { body: "#F4F3EE", shade: "#DAD8CF", trim: "#1E6B45", trim2: "#F2C824", zip: "#9A978C", light: true } },
  { slug: "bleu", name: "Bleu", hex: "#27479A", swatch: { body: "#27479A", shade: "#1C3577", trim: "#F2C824", trim2: "#FFFFFF", zip: "#101E44", light: false } },
  { slug: "jaune", name: "Jaune", hex: "#F2C824", swatch: { body: "#F2C824", shade: "#D9AF12", trim: "#1E6B45", trim2: "#27479A", zip: "#5E4A05", light: true } },
];

const TESTIMONIALS = [
  { author: "Imen D.", text: "incroyable vraiment, je vous ai vu sur TikTok au début j'hésitais, j'ai vu les avis sur le site et j'ai direct acheté" },
  { author: "Carla G.", text: "rien à dire vraiment c'est top, la qualité est bonne. Le délai de livraison était un peu long mais j'ai pas attendu beaucoup de temps, je vous avais vu sur TikTok depuis quelques jours et je l'ai pris sans hésiter." },
  { author: "Shaima A.", text: "je suis trop contente, vous avez sauvé ma rentrée" },
  { author: "Hicham Q.", text: "j'avais oublié de mettre un avis j'ai reçu ma commande vendredi après midi merci à vous j'pensais que j'allais me faire arnaquer" },
  { author: "Ayoub K.", text: "C'est carré" },
  { author: "Julien", text: "OP" },
];

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI manquant (.env.local).");
  await mongoose.connect(uri);
  console.log("→ Connecté à MongoDB");
  await Promise.all([Product.syncIndexes(), Category.syncIndexes(), Settings.syncIndexes(), AdminUser.syncIndexes(), Testimonial.syncIndexes()]);

  const category = await Category.findOneAndUpdate(
    { slug: "vestes" },
    { $setOnInsert: { name: "Vestes", slug: "vestes", description: "Coupe-vent légers.", sortOrder: 0 } },
    { upsert: true, returnDocument: "after" },
  );

  const outDir = path.resolve("public/products");
  for (const [i, c] of COLORS.entries()) {
    const slug = `veste-bresil-${c.slug}`;
    const imgs = writePlaceholders(slug, c.name, c.swatch, outDir);
    const doc = {
      name: `Veste Brésil ${c.name}`,
      slug,
      category: category._id,
      group: "veste-bresil",
      color: { name: c.name, hex: c.hex },
      tagline: "Coupe-vent léger aux couleurs du Brésil.",
      description:
        "Coupe-vent léger aux couleurs du Brésil, coupe ample et fermeture zippée. La pièce qui habille une tenue sans l'alourdir.",
      details: ["Coupe-vent léger", "Coupe ample", "Fermeture zippée intégrale", "Capuche avec cordon de serrage"],
      material: "",
      care: "",
      priceCents: 1999,
      compareAtCents: null,
      images: imgs.map((im) => ({
        url: `/products/${im.file}`,
        alt: `Veste Brésil ${c.name} — ${im.alt} (illustration provisoire)`,
        kind: "placeholder" as const,
      })),
      // Real stock levels are unknown: tracking stays off (null) until the client sets them in the admin.
      sizes: SIZES.map((label) => ({ label, enabled: true, stock: null })),
      status: "active" as const,
      bundleEligible: true,
      sortOrder: i,
      seo: {
        title: `Veste Brésil ${c.name} — 19,99 €`,
        description: `Veste Brésil ${c.name} : coupe-vent léger, coupe ample, zip intégral. Du XS au 3XL. 2 vestes pour 24,95 €.`,
      },
    };
    const exists = await Product.exists({ slug });
    if (!exists) {
      await Product.create(doc);
      console.log(`  + produit ${doc.name}`);
    } else if (RESET) {
      await Product.updateOne({ slug }, { $set: doc });
      console.log(`  ↻ produit ${doc.name} (réinitialisé)`);
    } else {
      console.log(`  = produit ${doc.name} (déjà présent)`);
    }
  }

  const settings = await Settings.findOne({ key: "store" });
  if (!settings) {
    await Settings.create({ key: "store", data: DEFAULT_SETTINGS });
    console.log("  + réglages de la boutique");
  } else if (RESET) {
    settings.data = DEFAULT_SETTINGS;
    settings.markModified("data");
    await settings.save();
    console.log("  ↻ réglages réinitialisés");
  }

  if ((await Testimonial.countDocuments()) === 0) {
    await Testimonial.insertMany(
      TESTIMONIALS.map((t, i) => ({
        ...t,
        rating: 5,
        verified: false,
        published: false,
        source: "Repris de kaltshop.club — à confirmer par le client avant publication",
        sortOrder: i,
      })),
    );
    console.log(`  + ${TESTIMONIALS.length} avis importés (non publiés)`);
  }

  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? "";
  if (email && password) {
    if (password.length < 10) throw new Error("SEED_ADMIN_PASSWORD doit faire au moins 10 caractères.");
    if (!(await AdminUser.exists({ email }))) {
      await AdminUser.create({ email, name: "Admin", passwordHash: await bcrypt.hash(password, 12), role: "owner" });
      console.log(`  + compte admin ${email}`);
    } else {
      console.log(`  = compte admin ${email} (déjà présent)`);
    }
  } else {
    console.log("  ! SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD absents : aucun admin créé (voir `npm run admin:create`).");
  }

  await mongoose.disconnect();
  console.log("✓ Seed terminé");
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
