import { Schema, model, models, type InferSchemaType, type Model, Types } from "mongoose";

/** Fulfilment lifecycle, independent from payment. */
export const ORDER_STATUSES = ["pending_confirmation", "confirmed", "fulfilled", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/**
 * Payment lifecycle. Until a provider is integrated every order is created as
 * "awaiting_payment_setup". "paid" may only be set by a verified provider
 * webhook or by an admin who recorded an offline payment.
 */
export const PAYMENT_STATUSES = [
  "awaiting_payment_setup",
  "unpaid",
  "pending",
  "paid",
  "failed",
  "refunded",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

const LineItemSchema = new Schema(
  {
    product: { type: Types.ObjectId, ref: "Product", required: true },
    slug: String,
    name: String,
    color: String,
    size: String,
    image: String,
    unitPriceCents: Number,
  },
  { _id: false },
);

const LineSchema = new Schema(
  {
    kind: { type: String, enum: ["single", "bundle"], required: true },
    label: String,
    items: { type: [LineItemSchema], default: [] },
    quantity: { type: Number, required: true, min: 1 },
    unitPriceCents: { type: Number, required: true },
    compareAtCents: { type: Number, required: true },
    totalCents: { type: Number, required: true },
  },
  { _id: false },
);

const HistorySchema = new Schema(
  {
    at: { type: Date, default: () => new Date() },
    type: { type: String, enum: ["created", "status", "payment", "note", "cancelled", "checkout"], required: true },
    from: String,
    to: String,
    by: String,
    message: String,
  },
  { _id: false },
);

const NoteSchema = new Schema(
  {
    at: { type: Date, default: () => new Date() },
    author: String,
    text: { type: String, required: true, maxlength: 2000 },
  },
  { _id: true },
);

const OrderSchema = new Schema(
  {
    number: { type: String, required: true },
    /** Random token used for the customer's confirmation URL (not guessable). */
    publicToken: { type: String, required: true },
    /** Client-generated key that makes order submission idempotent. */
    idempotencyKey: { type: String, required: true },
    requestFingerprint: String,
    creationState: { type: String, enum: ["preparing", "ready"], default: "ready" },
    marketingConsent: { type: Boolean, default: false },
    attribution: { fbclid: String, sccid: String },
    customer: {
      firstName: String,
      lastName: String,
      fullName: { type: String, required: true },
      email: { type: String, required: true, lowercase: true },
      phone: { type: String, required: true },
      phoneCountry: String,
      phoneE164: String,
    },
    shipping: {
      address: { type: String, required: true },
      address2: { type: String, default: "" },
      postalCode: { type: String, required: true },
      city: { type: String, required: true },
      country: { type: String, required: true },
    },
    customerNote: { type: String, default: "" },
    lines: { type: [LineSchema], default: [] },
    itemsCount: { type: Number, required: true },
    subtotalCents: { type: Number, required: true },
    discountCents: { type: Number, required: true },
    shippingCents: { type: Number, required: true },
    totalCents: { type: Number, required: true },
    currency: { type: String, default: "EUR" },
    status: { type: String, enum: ORDER_STATUSES, default: "pending_confirmation" },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: "awaiting_payment_setup" },
    payment: {
      provider: { type: String, default: null },
      sessionId: { type: String, default: null },
      paidAt: { type: Date, default: null },
    },
    /** True while stock has been decremented for this order (released on cancel). */
    stockReserved: { type: Boolean, default: false },
    internalNotes: { type: [NoteSchema], default: [] },
    history: { type: [HistorySchema], default: [] },
    meta: {
      ip: String,
      userAgent: String,
    },
  },
  { timestamps: true },
);

OrderSchema.index({ number: 1 }, { unique: true });
OrderSchema.index({ publicToken: 1 }, { unique: true });
OrderSchema.index({ idempotencyKey: 1 }, { unique: true });
OrderSchema.index({ status: 1, createdAt: -1 });
OrderSchema.index({ paymentStatus: 1, createdAt: -1 });
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ "customer.email": 1 });

type InferredOrder = InferSchemaType<typeof OrderSchema>;
export type OrderDoc = Omit<InferredOrder, "customer" | "shipping"> & {
  _id: Types.ObjectId;
  customer: { fullName: string; firstName?: string; lastName?: string; email: string; phone: string; phoneCountry?: string; phoneE164?: string };
  shipping: { address: string; address2: string; postalCode: string; city: string; country: string };
  createdAt: Date;
  updatedAt: Date;
};

export const Order: Model<OrderDoc> =
  (models.Order as Model<OrderDoc>) || model<OrderDoc>("Order", OrderSchema);
