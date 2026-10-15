import { z } from "zod";
import { isValidObjectId } from "mongoose";
import { adminRoute, errorJson, json } from "@/lib/http";
import { connectDB } from "@/lib/db";
import { ContactMessage } from "@/models/misc";

const schema = z.object({ status: z.enum(["new", "read", "archived"]) });

export const PATCH = adminRoute<RouteContext<"/api/admin/messages/[id]">>(async (req, ctx) => {
  const { id } = await ctx.params;
  if (!isValidObjectId(id)) return errorJson(404, "Message introuvable.");
  const { status } = schema.parse(await req.json());
  await connectDB();
  const res = await ContactMessage.updateOne({ _id: id }, { $set: { status } });
  if (res.matchedCount === 0) return errorJson(404, "Message introuvable.");
  return json({ ok: true });
});
