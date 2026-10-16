import { adminRoute, json } from "@/lib/http";
import { connectDB } from "@/lib/db";
import { settingsSchema } from "@/lib/validation";
import { Settings } from "@/models/misc";

export const PUT = adminRoute(async (req) => {
  const data = settingsSchema.parse(await req.json());
  await connectDB();
  // Field-by-field $set: keys owned by other screens (countdown, pop-ups) are left untouched.
  const $set = Object.fromEntries(Object.entries(data).map(([k, v]) => [`data.${k}`, v]));
  await Settings.updateOne({ key: "store" }, { $set }, { upsert: true });
  return json({ ok: true });
});
