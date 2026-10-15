import { adminRoute, json } from "@/lib/http";
import { connectDB } from "@/lib/db";
import { settingsSchema } from "@/lib/validation";
import { Settings } from "@/models/misc";

export const PUT = adminRoute(async (req) => {
  const data = settingsSchema.parse(await req.json());
  await connectDB();
  await Settings.updateOne({ key: "store" }, { $set: { data } }, { upsert: true });
  return json({ ok: true });
});
