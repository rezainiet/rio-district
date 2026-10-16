import "server-only";
import { Types, type QueryFilter } from "mongoose";
import { connectDB } from "./db";
import { displayName, summarizeRatings, type RatingSummary } from "./marketing";
import type { PublicProduct } from "./types";
import { Testimonial, type TestimonialDoc } from "@/models/misc";

export type PublicReview = {
  id: string;
  author: string;
  title: string;
  text: string;
  rating: number;
  verified: boolean;
  /** When the review was written, or null when unknown (imported reviews): no date is invented. */
  date: string | null;
  /** Colour of the jacket reviewed, when known. */
  color: string;
  photos: string[];
};

export type ReviewBlock = { summary: RatingSummary; reviews: PublicReview[] };

/** Known writing date: explicit `reviewedAt`, or the submission time of a site review. */
function reviewDate(t: TestimonialDoc) {
  if (t.reviewedAt) return new Date(t.reviewedAt).toISOString();
  if (t.submittedBy === "customer" && t.createdAt) return new Date(t.createdAt).toISOString();
  return null;
}

function toPublic(t: TestimonialDoc, colorById: Map<string, string>): PublicReview {
  return {
    id: String(t._id),
    // Only the first name and initial are shown, whatever was typed.
    author: displayName(t.author),
    title: t.title ?? "",
    text: t.text,
    rating: t.rating ?? 5,
    verified: Boolean(t.verified),
    date: reviewDate(t),
    color: t.product ? colorById.get(String(t.product)) ?? "" : "",
    photos: t.photos ?? [],
  };
}

// Dated reviews first (newest first), then undated ones in their curated order.
const ORDER = { reviewedAt: -1, sortOrder: 1, createdAt: -1 } as const;

/**
 * Published reviews for a product. The six colours are the same jacket, so a
 * product page shows the reviews of every colour plus the reviews of the model
 * as a whole (imported reviews whose colour is unknown).
 */
export async function getProductReviews(product: PublicProduct, siblings: PublicProduct[]): Promise<ReviewBlock> {
  await connectDB();
  const group = siblings.length ? siblings : [product];
  const colorById = new Map(group.map((p) => [p.id, p.color.name]));
  const ids = group.map((p) => new Types.ObjectId(p.id));
  const filter: QueryFilter<TestimonialDoc> = product.group
    ? { published: true, $or: [{ product: { $in: ids } }, { group: product.group }] }
    : { published: true, product: { $in: ids } };
  const docs = await Testimonial.find(filter).sort(ORDER).limit(200).lean<TestimonialDoc[]>();
  return { summary: summarizeRatings(docs.map((d) => d.rating ?? 5)), reviews: docs.map((d) => toPublic(d, colorById)) };
}

/** Every published review (homepage). Returns an empty block when there is none. */
export async function getStoreReviews(products: PublicProduct[], limit = 6): Promise<ReviewBlock> {
  await connectDB();
  const colorById = new Map(products.map((p) => [p.id, p.color.name]));
  const [docs, ratings] = await Promise.all([
    Testimonial.find({ published: true }).sort(ORDER).limit(limit).lean<TestimonialDoc[]>(),
    Testimonial.find({ published: true }, { rating: 1 }).lean<{ rating?: number }[]>(),
  ]);
  return { summary: summarizeRatings(ratings.map((r) => r.rating ?? 5)), reviews: docs.map((d) => toPublic(d, colorById)) };
}
