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

/* ---------- Testimonials (only published ones are shown) ---------- */

const TestimonialSchema = new Schema(
  {
    author: { type: String, required: true, trim: true },
    text: { type: String, required: true, maxlength: 1500 },
    rating: { type: Number, min: 1, max: 5, default: 5 },
    /** True only when the client confirms it comes from a real customer order. */
    verified: { type: Boolean, default: false },
    published: { type: Boolean, default: false },
    source: { type: String, default: "" },
    product: { type: Types.ObjectId, ref: "Product", default: null },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);
TestimonialSchema.index({ published: 1, sortOrder: 1 });
export type TestimonialDoc = InferSchemaType<typeof TestimonialSchema> & { _id: Types.ObjectId };
export const Testimonial: Model<TestimonialDoc> =
  (models.Testimonial as Model<TestimonialDoc>) || model<TestimonialDoc>("Testimonial", TestimonialSchema);

/* ---------- Payment attempts (ready for a future provider) ---------- */

const PaymentAttemptSchema = new Schema(
  {
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
export type PaymentAttemptDoc = InferSchemaType<typeof PaymentAttemptSchema> & { _id: Types.ObjectId };
export const PaymentAttempt: Model<PaymentAttemptDoc> =
  (models.PaymentAttempt as Model<PaymentAttemptDoc>) ||
  model<PaymentAttemptDoc>("PaymentAttempt", PaymentAttemptSchema);
