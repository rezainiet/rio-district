import { z } from "zod";
import { adminRoute, json } from "@/lib/http";
import { connectDB } from "@/lib/db";
import { Testimonial } from "@/models/misc";

const schema = z.object({
  author: z.string().trim().min(1).max(80),
  text: z.string().trim().min(1).max(1500),
  rating: z.number().int().min(1).max(5),
  source: z.string().trim().max(200).default(""),
  verified: z.boolean(),
  published: z.boolean(),
});

export const POST = adminRoute(async (req) => {
  const data = schema.parse(await req.json());
  await connectDB();
  const doc = await Testimonial.create(data);
  return json({ ok: true, id: String(doc._id) }, 201);
});
