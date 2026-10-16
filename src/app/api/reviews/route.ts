import type { NextRequest } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { clientIp, errorJson, json, rateLimit, sameOrigin } from "@/lib/http";
import { log } from "@/lib/log";
import { fieldErrors, reviewSubmissionSchema } from "@/lib/validation";
import { MAX_REVIEW_PHOTOS, MAX_REVIEW_PHOTO_BYTES, storeReviewPhoto } from "@/lib/review-photos";
import { Product } from "@/models/Product";
import { Order } from "@/models/Order";
import { Testimonial } from "@/models/misc";

/**
 * Customer review submission. Reviews are stored as "pending" and never shown
 * until an admin approves them. "Achat vérifié" is set only when the order
 * number + e-mail match a DELIVERED order that contains this jacket.
 */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return errorJson(403, "Origine refusée.");
  const ip = clientIp(req);
  if (!rateLimit(`review:${ip}`, 3, 60 * 60_000)) {
    return errorJson(429, "Trop d'avis envoyés. Réessaie un peu plus tard.");
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return errorJson(400, "Requête invalide.");
  }
  const str = (k: string) => (typeof form.get(k) === "string" ? (form.get(k) as string) : "");
  // Honeypot filled → a bot: pretend success, store nothing, give no hint.
  if (str("website")) return json({ ok: true, verified: false }, 201);
  const parsed = reviewSubmissionSchema.safeParse({
    productId: str("productId"),
    name: str("name"),
    email: str("email"),
    rating: str("rating") || 0,
    title: str("title"),
    text: str("text"),
    orderNumber: str("orderNumber"),
    consent: form.get("consent") === "on" || form.get("consent") === "true",
    website: str("website"),
  });
  if (!parsed.success) {
    return errorJson(422, "Certains champs sont invalides.", { fields: fieldErrors(parsed.error) });
  }
  const data = parsed.data;

  const files = form.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > MAX_REVIEW_PHOTOS) {
    return errorJson(422, "Certains champs sont invalides.", { fields: { photos: `${MAX_REVIEW_PHOTOS} photos maximum.` } });
  }
  if (files.some((f) => f.size > MAX_REVIEW_PHOTO_BYTES)) {
    return errorJson(422, "Certains champs sont invalides.", { fields: { photos: "6 Mo maximum par photo." } });
  }

  await connectDB();
  const product = await Product.findOne({ _id: data.productId, status: "active" }, { group: 1 }).lean<{ _id: Types.ObjectId; group?: string }>();
  if (!product) return errorJson(404, "Produit introuvable.");
  const groupIds = product.group
    ? (await Product.find({ group: product.group }, { _id: 1 }).lean<{ _id: Types.ObjectId }[]>()).map((p) => p._id)
    : [product._id];

  // One review per person and per jacket model (rejected ones don't count).
  const duplicate = await Testimonial.exists({ email: data.email, product: { $in: groupIds }, status: { $ne: "rejected" } });
  if (duplicate) return errorJson(409, "Tu as déjà laissé un avis sur cette veste. Merci !");

  let orderId: Types.ObjectId | null = null;
  if (data.orderNumber) {
    const order = await Order.findOne(
      { number: data.orderNumber, "customer.email": data.email },
      { status: 1, "lines.items.product": 1 },
    ).lean<{ _id: Types.ObjectId; status: string; lines: { items: { product: Types.ObjectId }[] }[] }>();
    const contains = order?.lines.some((l) => l.items.some((i) => groupIds.some((g) => g.equals(i.product))));
    if (!order || !contains) {
      return errorJson(422, "Certains champs sont invalides.", {
        fields: { orderNumber: "Commande introuvable pour cet e-mail et cette veste. Laisse le champ vide si besoin." },
      });
    }
    if (order.status !== "fulfilled") {
      return errorJson(422, "Certains champs sont invalides.", {
        fields: { orderNumber: "Cette commande n'est pas encore livrée : reviens nous donner ton avis après réception." },
      });
    }
    if (await Testimonial.exists({ order: order._id, product: { $in: groupIds }, status: { $ne: "rejected" } })) {
      return errorJson(409, "Un avis a déjà été envoyé pour cette commande. Merci !");
    }
    orderId = order._id;
  }

  const photos: string[] = [];
  for (const f of files) {
    try {
      photos.push(await storeReviewPhoto(Buffer.from(await f.arrayBuffer())));
    } catch {
      return errorJson(422, "Certains champs sont invalides.", { fields: { photos: "Photo illisible (JPG, PNG, WebP ou HEIC)." } });
    }
  }

  const doc = await Testimonial.create({
    author: data.name,
    title: data.title,
    text: data.text,
    rating: data.rating,
    email: data.email,
    product: product._id,
    order: orderId,
    orderNumber: orderId ? data.orderNumber : "",
    verified: Boolean(orderId),
    photos,
    status: "pending",
    published: false,
    submittedBy: "customer",
    source: "Formulaire du site",
    reviewedAt: new Date(),
  });
  log.info("review.submitted", { id: String(doc._id), verified: Boolean(orderId), photos: photos.length });
  return json({ ok: true, verified: Boolean(orderId) }, 201);
}
