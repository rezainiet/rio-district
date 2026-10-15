import { z } from "zod";
import { isValidObjectId } from "mongoose";
import { adminRoute, errorJson, json } from "@/lib/http";
import { connectDB } from "@/lib/db";
import { Testimonial } from "@/models/misc";

type Ctx = RouteContext<"/api/admin/testimonials/[id]">;
const schema = z.object({ published: z.boolean().optional(), verified: z.boolean().optional() });

export const PATCH = adminRoute<Ctx>(async (req, ctx) => {
  const { id } = await ctx.params;
  if (!isValidObjectId(id)) return errorJson(404, "Avis introuvable.");
  const patch = schema.parse(await req.json());
  await connectDB();
  await Testimonial.updateOne({ _id: id }, { $set: patch });
  return json({ ok: true });
});

export const DELETE = adminRoute<Ctx>(async (_req, ctx) => {
  const { id } = await ctx.params;
  if (!isValidObjectId(id)) return errorJson(404, "Avis introuvable.");
  await connectDB();
  await Testimonial.deleteOne({ _id: id });
  return json({ ok: true });
});
