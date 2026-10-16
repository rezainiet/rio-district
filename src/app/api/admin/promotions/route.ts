import { adminRoute, json } from "@/lib/http";
import { connectDB } from "@/lib/db";
import { log } from "@/lib/log";
import { promotionsSchema } from "@/lib/validation";
import { Settings } from "@/models/misc";

/** Saves the countdown and pop-up configuration (Admin → Promotions). */
export const PUT = adminRoute(async (req, _ctx, admin) => {
  const data = promotionsSchema.parse(await req.json());
  await connectDB();
  await Settings.updateOne(
    { key: "store" },
    { $set: { "data.countdown": data.countdown, "data.popups": data.popups } },
    { upsert: true },
  );
  log.info("promotions.updated", {
    by: admin.email,
    countdown: data.countdown.enabled,
    welcome: data.popups.welcome.enabled,
    exitIntent: data.popups.exitIntent.enabled,
    cartReminder: data.popups.cartReminder.enabled,
  });
  return json({ ok: true });
});
