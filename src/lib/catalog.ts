import "server-only";
import { Types } from "mongoose";
import { connectDB } from "./db";
import { DEFAULT_SETTINGS, type StoreSettings } from "./defaults";
import type { PublicProduct } from "./types";
import { Product, type ProductDoc } from "@/models/Product";
import { Settings } from "@/models/misc";

const LOW_STOCK = 3;

export function toPublicProduct(p: ProductDoc): PublicProduct {
  return {
    id: String(p._id),
    slug: p.slug,
    name: p.name,
    group: p.group ?? "",
    color: { name: p.color?.name ?? "", hex: p.color?.hex ?? "#121212" },
    tagline: p.tagline ?? "",
    description: p.description ?? "",
    details: p.details ?? [],
    material: p.material ?? "",
    care: p.care ?? "",
    priceCents: p.priceCents,
    compareAtCents: p.compareAtCents ?? null,
    images: (p.images ?? []).map((i) => ({ url: i.url, alt: i.alt ?? "", kind: (i.kind ?? "photo") as "photo" | "placeholder" })),
    sizes: (p.sizes ?? []).map((s) => {
      const tracked = typeof s.stock === "number";
      const available = Boolean(s.enabled) && (!tracked || (s.stock as number) > 0);
      return {
        label: s.label as PublicProduct["sizes"][number]["label"],
        available,
        remaining: tracked && available && (s.stock as number) <= LOW_STOCK ? (s.stock as number) : null,
      };
    }),
    bundleEligible: Boolean(p.bundleEligible),
  };
}

function deepMerge<T>(base: T, patch: unknown): T {
  if (Array.isArray(base) || typeof base !== "object" || base === null) {
    return (patch === undefined ? base : patch) as T;
  }
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  if (patch && typeof patch === "object") {
    for (const [k, v] of Object.entries(patch as Record<string, unknown>)) {
      out[k] = k in out ? deepMerge(out[k], v) : v;
    }
  }
  return out as T;
}

export async function getSettings(): Promise<StoreSettings> {
  await connectDB();
  const doc = await Settings.findOne({ key: "store" }).lean();
  return deepMerge(DEFAULT_SETTINGS, doc?.data);
}

export async function getActiveProducts(): Promise<PublicProduct[]> {
  await connectDB();
  const docs = await Product.find({ status: "active" }).sort({ sortOrder: 1, createdAt: 1 }).lean<ProductDoc[]>();
  return docs.map(toPublicProduct);
}

export async function getProductBySlug(slug: string): Promise<PublicProduct | null> {
  await connectDB();
  const doc = await Product.findOne({ slug, status: "active" }).lean<ProductDoc>();
  return doc ? toPublicProduct(doc) : null;
}

/** Loads active products by id for server-side pricing. */
export async function getProductMap(ids: string[]) {
  await connectDB();
  const valid = [...new Set(ids)].filter((id) => Types.ObjectId.isValid(id));
  const docs = await Product.find({ _id: { $in: valid }, status: "active" }).lean<ProductDoc[]>();
  return new Map(docs.map((d) => [String(d._id), toPublicProduct(d)]));
}
