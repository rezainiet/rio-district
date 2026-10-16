/**
 * Creates an admin account or resets its password.
 *
 *   npm run admin:create -- --email you@example.com --password "a-long-password"
 *
 * On a server, keep the password out of the shell history:
 *   read -rs ADMIN_PASSWORD && export ADMIN_PASSWORD && npm run admin:create -- --email you@domaine.fr
 *
 * There is intentionally no public registration page.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { AdminUser } from "../src/models/misc";

function arg(name: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

async function main() {
  const email = arg("email")?.trim().toLowerCase();
  const password = arg("password") ?? process.env.ADMIN_PASSWORD ?? "";
  const name = arg("name") ?? "Admin";
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("--email invalide.");
  if (password.length < 10) throw new Error("--password : 10 caractères minimum.");
  const production = process.env.APP_ENV === "production" || process.env.NODE_ENV === "production";
  if (production && (password.length < 16 || !/[a-z]/i.test(password) || !/\d/.test(password))) {
    throw new Error("Production : mot de passe d'au moins 16 caractères, avec lettres et chiffres.");
  }

  await mongoose.connect(process.env.MONGODB_URI!);
  const passwordHash = await bcrypt.hash(password, 12);
  const res = await AdminUser.findOneAndUpdate(
    { email },
    { $set: { passwordHash, active: true, name }, $setOnInsert: { email, role: "owner" } },
    { upsert: true, returnDocument: "after", includeResultMetadata: true },
  );
  console.log(res.lastErrorObject?.updatedExisting ? `✓ Mot de passe mis à jour pour ${email}` : `✓ Admin créé : ${email}`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("✗", err.message);
  await mongoose.disconnect();
  process.exit(1);
});
