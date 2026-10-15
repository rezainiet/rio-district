import { isValidObjectId } from "mongoose";
import { adminRoute, errorJson, json } from "@/lib/http";
import { connectDB } from "@/lib/db";
import { productInputSchema } from "@/lib/validation";
import { checkImageUrls, toProductDoc } from "@/lib/product-admin";
import { Product } from "@/models/Product";
import { Order } from "@/models/Order";

type Ctx = RouteContext<"/api/admin/products/[id]">;

export const PATCH = adminRoute<Ctx>(async (req, ctx) => {
  const { id } = await ctx.params;
  if (!isValidObjectId(id)) return errorJson(404, "Produit introuvable.");
  const input = productInputSchema.parse(await req.json());
  const imageErrors = checkImageUrls(input.images);
  if (Object.keys(imageErrors).length) return errorJson(422, "Certaines images sont invalides.", { fields: imageErrors });

  await connectDB();
  if (await Product.exists({ slug: input.slug, _id: { $ne: id } })) {
    return errorJson(409, "Ce slug est déjà utilisé.", { fields: { slug: "Slug déjà utilisé." } });
  }
  const res = await Product.updateOne({ _id: id }, { $set: toProductDoc(input) }, { runValidators: true });
  if (res.matchedCount === 0) return errorJson(404, "Produit introuvable.");
  return json({ ok: true, id });
});

/** Archives by default. `?hard=1` deletes, only when no order references the product. */
export const DELETE = adminRoute<Ctx>(async (req, ctx) => {
  const { id } = await ctx.params;
  if (!isValidObjectId(id)) return errorJson(404, "Produit introuvable.");
  await connectDB();
  const hard = req.nextUrl.searchParams.get("hard") === "1";
  if (hard) {
    if (await Order.exists({ "lines.items.product": id })) {
      return errorJson(409, "Ce produit figure dans des commandes : archive-le plutôt que de le supprimer.");
    }
    await Product.deleteOne({ _id: id });
    return json({ ok: true, deleted: true });
  }
  await Product.updateOne({ _id: id }, { $set: { status: "archived" } });
  return json({ ok: true, archived: true });
});
