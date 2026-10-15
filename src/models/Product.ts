import { Schema, model, models, type InferSchemaType, type Model, Types } from "mongoose";
import { SIZES } from "@/lib/sizes";

const ImageSchema = new Schema(
  {
    url: { type: String, required: true, trim: true },
    alt: { type: String, default: "", trim: true },
    /** "placeholder" = illustration provisoire, à remplacer par une photo sous licence. */
    kind: { type: String, enum: ["photo", "placeholder"], default: "photo" },
  },
  { _id: false },
);

const SizeSchema = new Schema(
  {
    label: { type: String, enum: SIZES, required: true },
    enabled: { type: Boolean, default: true },
    /** null = stock non suivi (disponibilité illimitée). */
    stock: { type: Number, default: null, min: 0 },
  },
  { _id: false },
);

const ProductSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, trim: true, lowercase: true },
    category: { type: Types.ObjectId, ref: "Category", default: null },
    /** Products sharing a group are presented as colour variants of one model. */
    group: { type: String, default: "", trim: true, index: true },
    color: {
      name: { type: String, default: "", trim: true },
      hex: { type: String, default: "#121212", trim: true },
    },
    tagline: { type: String, default: "", trim: true, maxlength: 200 },
    description: { type: String, default: "", maxlength: 5000 },
    details: { type: [String], default: [] },
    material: { type: String, default: "" },
    care: { type: String, default: "" },
    priceCents: { type: Number, required: true, min: 0 },
    compareAtCents: { type: Number, default: null, min: 0 },
    currency: { type: String, default: "EUR" },
    images: { type: [ImageSchema], default: [] },
    sizes: { type: [SizeSchema], default: [] },
    status: { type: String, enum: ["active", "draft", "archived"], default: "draft", index: true },
    bundleEligible: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    seo: {
      title: { type: String, default: "" },
      description: { type: String, default: "" },
    },
  },
  { timestamps: true },
);

ProductSchema.index({ slug: 1 }, { unique: true });
ProductSchema.index({ status: 1, sortOrder: 1 });

export type ProductDoc = InferSchemaType<typeof ProductSchema> & { _id: Types.ObjectId };

export const Product: Model<ProductDoc> =
  (models.Product as Model<ProductDoc>) || model<ProductDoc>("Product", ProductSchema);
