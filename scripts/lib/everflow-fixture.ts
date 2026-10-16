import { randomBytes, createHash } from "node:crypto";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { Product } from "../../src/models/Product";
import { Order } from "../../src/models/Order";
import { AdminSession, AdminUser, PaymentAttempt, Settings } from "../../src/models/misc";
import { DEFAULT_SETTINGS } from "../../src/lib/defaults";
import { SIZES } from "../../src/lib/sizes";
import { EVERFLOW_OFFERS } from "../../src/lib/payments/everflow";

export function assertTestUri(uri: string) {
  if (!/^mongodb:\/\/127\.0\.0\.1:\d+\/rio_everflow_test_[a-z0-9_]+$/i.test(uri)) throw new Error("Refusing non-isolated test database.");
}
export function mockEnvironment(uri: string) {
  assertTestUri(uri);
  return { APP_ENV: "development", MONGODB_URI: uri, PAYMENT_PROVIDER: "everflow", EVERFLOW_ENABLED: "true", EVERFLOW_MODE: "mock",
    EVERFLOW_SINGLE_CHECKOUT_URL: EVERFLOW_OFFERS.single.url, EVERFLOW_BUNDLE_CHECKOUT_URL: EVERFLOW_OFFERS.bundle.url,
    EVERFLOW_PUBLIC_ASSET_BASE_URL: "https://riodistrict.store", RIO_EVERFLOW_TEST: "true", EVERFLOW_PIXEL_PLATFORM: "",
    EVERFLOW_FACEBOOK_PIXEL_ID: "", EVERFLOW_TIKTOK_PIXEL_ID: "", EVERFLOW_GOOGLE_PIXEL_ID: "", EVERFLOW_GOOGLE_PIXEL_LABEL: "", EVERFLOW_SNAPCHAT_PIXEL_ID: "",
    EVERFLOW_SUB1_MODE: "disabled", EVERFLOW_PROVIDER_CLICK_ID: "", EVERFLOW_SOURCE_ID: "", EVERFLOW_COUNTRIES: "FR", EVERFLOW_LIVE_APPROVED: "false" };
}
/** Fictional fixtures only. Never reads, resets or copies the normal store database. */
export async function seedTestDatabase(uri: string) {
  assertTestUri(uri);
  await mongoose.connect(uri);
  await Promise.all([Product.init(), Order.init(), PaymentAttempt.init()]);
  const colors = [["vert", "Vert", "#9dceca"], ["rose", "Rose", "#e6a0ba"], ["noir", "Noir", "#181a1d"], ["blanc", "Blanc", "#efefeb"], ["bleu", "Bleu", "#084a99"], ["jaune", "Jaune", "#eff22a"]];
  const products = [];
  for (const [slug, name, hex] of colors) products.push(await Product.findOneAndUpdate({ slug: `veste-bresil-${slug}` }, { $setOnInsert: {
    name: `Veste Brésil ${name}`, group: "veste-bresil", color: { name, hex }, priceCents: 1999, currency: "EUR", status: "active", bundleEligible: true,
    images: [{ url: `/products/reference/veste-bresil-${slug}-face.webp`, alt: `Veste Brésil ${name}`, kind: "photo" }],
    sizes: SIZES.map(label => ({ label, enabled: true, stock: 50 })),
  } }, { upsert: true, returnDocument: "after" }));
  await Settings.updateOne({ key: "store" }, { $setOnInsert: { data: DEFAULT_SETTINGS } }, { upsert: true });
  const password = randomBytes(24).toString("base64url");
  const admin = await AdminUser.findOneAndUpdate({ email: "everflow-qa@example.test" }, { $setOnInsert: { name: "Local payment QA", active: true, role: "owner" }, $set: { passwordHash: await bcrypt.hash(password, 12) } }, { upsert: true, returnDocument: "after" });
  const token = randomBytes(32).toString("base64url");
  await AdminSession.create({ user: admin._id, tokenHash: createHash("sha256").update(token).digest("hex"), expiresAt: new Date(Date.now() + 86400_000) });
  return { uri, products: products.map(p => ({ id: String(p._id), slug: p.slug, color: p.color?.name })), adminToken: token, adminEmail: admin.email, adminPassword: password };
}
