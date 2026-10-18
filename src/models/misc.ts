import { Schema, model, models, type InferSchemaType, type Model, Types } from "mongoose";

/* ---------- Settings (single document, key = "store") ---------- */

const SettingsSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, default: "store" },
    /** Stored as a free-form object validated by Zod (see lib/validation.ts). */
    data: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true, minimize: false },
);
export type SettingsDoc = InferSchemaType<typeof SettingsSchema> & { _id: Types.ObjectId };
export const Settings: Model<SettingsDoc> =
  (models.Settings as Model<SettingsDoc>) || model<SettingsDoc>("Settings", SettingsSchema);

/* ---------- Sequential counters (order numbers) ---------- */

const CounterSchema = new Schema({ _id: { type: String, required: true }, seq: { type: Number, default: 0 } });
export const Counter: Model<{ _id: string; seq: number }> =
  (models.Counter as Model<{ _id: string; seq: number }>) || model("Counter", CounterSchema);

/* ---------- Admin users & sessions ---------- */

const AdminUserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    username: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    name: { type: String, default: "" },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["owner", "staff"], default: "owner" },
    active: { type: Boolean, default: true },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true },
);
export type AdminUserDoc = InferSchemaType<typeof AdminUserSchema> & { _id: Types.ObjectId };
export const AdminUser: Model<AdminUserDoc> =
  (models.AdminUser as Model<AdminUserDoc>) || model<AdminUserDoc>("AdminUser", AdminUserSchema);

const AdminSessionSchema = new Schema(
  {
    /** SHA-256 of the cookie token; the raw token is never stored. */
    tokenHash: { type: String, required: true, unique: true },
    user: { type: Types.ObjectId, ref: "AdminUser", required: true },
    expiresAt: { type: Date, required: true },
    userAgent: String,
  },
  { timestamps: true },
);
AdminSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export type AdminSessionDoc = InferSchemaType<typeof AdminSessionSchema> & { _id: Types.ObjectId };
export const AdminSession: Model<AdminSessionDoc> =
  (models.AdminSession as Model<AdminSessionDoc>) ||
  model<AdminSessionDoc>("AdminSession", AdminSessionSchema);

/* ---------- Contact messages ---------- */

const ContactMessageSchema = new Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    name: { type: String, default: "" },
    message: { type: String, required: true, maxlength: 3000 },
    status: { type: String, enum: ["new", "read", "archived"], default: "new" },
  },
  { timestamps: true },
);
ContactMessageSchema.index({ status: 1, createdAt: -1 });
export type ContactMessageDoc = InferSchemaType<typeof ContactMessageSchema> & { _id: Types.ObjectId };
export const ContactMessage: Model<ContactMessageDoc> =
  (models.ContactMessage as Model<ContactMessageDoc>) ||
  model<ContactMessageDoc>("ContactMessage", ContactMessageSchema);

/* ---------- Reviews / testimonials (only published ones are shown) ---------- */

/**
 * Moderation workflow. Customer submissions arrive as "pending"; only an admin
 * can approve them. `published` remains the single visibility switch and can
 * only be true for an approved review (enforced by the admin API).
 * Documents created before this field existed have no status: they are read
 * as "approved" when published and "pending" otherwise.
 */
export const REVIEW_STATUSES = ["pending", "approved", "rejected"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

const TestimonialSchema = new Schema(
  {
    author: { type: String, required: true, trim: true },
    title: { type: String, default: "", maxlength: 80 },
    text: { type: String, required: true, maxlength: 1500 },
    rating: { type: Number, min: 1, max: 5, default: 5 },
    /** True only when the review matches a delivered order, or the client confirmed it. */
    verified: { type: Boolean, default: false },
    published: { type: Boolean, default: false },
    status: { type: String, enum: REVIEW_STATUSES },
    source: { type: String, default: "" },
    /** admin = typed in the admin; customer = site form; import = carried over from the reference store. */
    submittedBy: { type: String, enum: ["admin", "customer", "import"], default: "admin" },
    product: { type: Types.ObjectId, ref: "Product", default: null },
    /** Review of the whole model (all colours), e.g. "veste-bresil", when the colour is unknown. */
    group: { type: String, default: "" },
    /** When the customer wrote it. Unknown for imported reviews: no date is shown rather than an invented one. */
    reviewedAt: { type: Date, default: null },
    /** Stable key of an imported review (prevents duplicates across re-imports). */
    importKey: { type: String },
    /** Where an imported review comes from, kept for audit. */
    provenance: {
      origin: { type: String, default: "" },
      url: { type: String, default: "" },
      capturedAt: { type: Date, default: null },
      originalPhoto: { type: String, default: "" },
    },
    /** Private: never rendered on the storefront. */
    email: { type: String, lowercase: true, trim: true, default: "" },
    order: { type: Types.ObjectId, ref: "Order", default: null },
    orderNumber: { type: String, default: "" },
    /** Review photo URLs (/uploads/reviews/…), served only once the review is published. */
    photos: { type: [String], default: [] },
    moderatedAt: { type: Date, default: null },
    moderatedBy: { type: String, default: "" },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);
TestimonialSchema.index({ published: 1, sortOrder: 1 });
TestimonialSchema.index({ product: 1, published: 1, createdAt: -1 });
TestimonialSchema.index({ email: 1, product: 1 });
TestimonialSchema.index({ photos: 1 });
TestimonialSchema.index({ group: 1, published: 1 });
TestimonialSchema.index({ importKey: 1 }, { unique: true, partialFilterExpression: { importKey: { $type: "string" } } });
export type TestimonialDoc = InferSchemaType<typeof TestimonialSchema> & { _id: Types.ObjectId; createdAt: Date; updatedAt: Date };
export const Testimonial: Model<TestimonialDoc> =
  (models.Testimonial as Model<TestimonialDoc>) || model<TestimonialDoc>("Testimonial", TestimonialSchema);

export function reviewStatus(t: { status?: string | null; published?: boolean | null }): ReviewStatus {
  return (t.status as ReviewStatus | undefined) ?? (t.published ? "approved" : "pending");
}

/* ---------- Payment attempts (ready for a future provider) ---------- */

const PaymentAttemptSchema = new Schema(
  {
    kind: { type: String, enum: ["session", "redirect"], default: "session" },
    mode: { type: String, enum: ["mock", "live"] },
    offer: { type: String, enum: ["single", "bundle"] },
    redirectIssuedAt: Date,
    redirectCount: { type: Number, default: 0 },
    correlationSent: { type: Boolean, default: false },
    configurationHash: String,
    order: { type: Types.ObjectId, ref: "Order", required: true, index: true },
    provider: { type: String, required: true },
    providerRef: { type: String, required: true },
    status: { type: String, enum: ["created", "pending", "succeeded", "failed", "cancelled"], default: "created" },
    amountCents: { type: Number, required: true },
    currency: { type: String, default: "EUR" },
    raw: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true },
);
PaymentAttemptSchema.index({ provider: 1, providerRef: 1 }, { unique: true });
PaymentAttemptSchema.index({ order: 1, provider: 1, kind: 1 }, { unique: true, partialFilterExpression: { kind: "redirect" } });
export type PaymentAttemptDoc = InferSchemaType<typeof PaymentAttemptSchema> & { _id: Types.ObjectId };
export const PaymentAttempt: Model<PaymentAttemptDoc> =
  (models.PaymentAttempt as Model<PaymentAttemptDoc>) ||
  model<PaymentAttemptDoc>("PaymentAttempt", PaymentAttemptSchema);
