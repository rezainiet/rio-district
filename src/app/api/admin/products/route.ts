import { adminRoute, errorJson, json } from "@/lib/http";
import { connectDB } from "@/lib/db";
import { productInputSchema } from "@/lib/validation";
import { checkImageUrls, toProductDoc } from "@/lib/product-admin";
import { Product } from "@/models/Product";

export const POST = adminRoute(async (req) => {
  const input = productInputSchema.parse(await req.json());
  const imageErrors = checkImageUrls(input.images);
  if (Object.keys(imageErrors).length) return errorJson(422, "Certaines images sont invalides.", { fields: imageErrors });

  await connectDB();
  if (await Product.exists({ slug: input.slug })) {
    return errorJson(409, "Ce slug est déjà utilisé.", { fields: { slug: "Slug déjà utilisé." } });
  }
  const doc = await Product.create(toProductDoc(input));
  return json({ ok: true, id: String(doc._id) }, 201);
});
