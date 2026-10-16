import { isValidObjectId } from "mongoose";
import { adminRoute, errorJson, json } from "@/lib/http";
import { connectDB } from "@/lib/db";
import { log } from "@/lib/log";
import { reviewModerationSchema } from "@/lib/validation";
import { Testimonial } from "@/models/misc";

type Ctx = RouteContext<"/api/admin/testimonials/[id]">;

/**
 * Moderation. "publish" = approve + show; "hide" = keep approved but take it
 * off the site; "reject" = refuse (never shown); "pending" = back to the queue.
 * A review can only be visible once it has been approved.
 */
const ACTIONS = {
  publish: { status: "approved", published: true },
  hide: { status: "approved", published: false },
  reject: { status: "rejected", published: false },
  pending: { status: "pending", published: false },
} as const;

export const PATCH = adminRoute<Ctx>(async (req, ctx, admin) => {
  const { id } = await ctx.params;
  if (!isValidObjectId(id)) return errorJson(404, "Avis introuvable.");
  const { action, verified } = reviewModerationSchema.parse(await req.json());
  await connectDB();
  const $set: Record<string, unknown> = { moderatedAt: new Date(), moderatedBy: admin.email };
  if (action) Object.assign($set, ACTIONS[action]);
  if (verified !== undefined) $set.verified = verified;
  const res = await Testimonial.updateOne({ _id: id }, { $set });
  if (res.matchedCount === 0) return errorJson(404, "Avis introuvable.");
  log.info("review.moderated", { id, action, verified, by: admin.email });
  return json({ ok: true });
});

export const DELETE = adminRoute<Ctx>(async (_req, ctx, admin) => {
  const { id } = await ctx.params;
  if (!isValidObjectId(id)) return errorJson(404, "Avis introuvable.");
  await connectDB();
  await Testimonial.deleteOne({ _id: id });
  log.info("review.deleted", { id, by: admin.email });
  return json({ ok: true });
});
