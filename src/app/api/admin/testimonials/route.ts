import { z } from "zod";
import { adminRoute, json } from "@/lib/http";
import { connectDB } from "@/lib/db";
import { Testimonial } from "@/models/misc";

/** Manual entry of a review the client received elsewhere (e-mail, message…). */
const schema = z.object({
  author: z.string().trim().min(1).max(80),
  title: z.string().trim().max(80).default(""),
  text: z.string().trim().min(1).max(1500),
  rating: z.number().int().min(1).max(5),
  productId: z.union([z.string().regex(/^[a-f0-9]{24}$/i), z.literal("")]).default(""),
  source: z.string().trim().min(3, "Indique la source de l'avis.").max(200),
  verified: z.boolean(),
  published: z.boolean(),
});

export const POST = adminRoute(async (req, _ctx, admin) => {
  const { productId, ...data } = schema.parse(await req.json());
  await connectDB();
  const doc = await Testimonial.create({
    ...data,
    product: productId || null,
    status: data.published ? "approved" : "pending",
    submittedBy: "admin",
    moderatedAt: data.published ? new Date() : null,
    moderatedBy: data.published ? admin.email : "",
  });
  return json({ ok: true, id: String(doc._id) }, 201);
});
