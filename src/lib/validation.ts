import { z } from "zod";
import { SIZES } from "./sizes";

// French default messages for any issue without a custom message.
z.config(z.locales.fr());

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, "Identifiant invalide.");
const size = z.enum(SIZES, { error: "Choisis une taille." });

export const cartLineSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("single"),
    productId: objectId,
    size,
    quantity: z.number().int().min(1).max(10),
  }),
  z.object({
    kind: z.literal("bundle"),
    items: z.array(z.object({ productId: objectId, size })).min(2).max(2),
    quantity: z.number().int().min(1).max(10),
  }),
]);

export const cartSchema = z.array(cartLineSchema).min(1, "Ton panier est vide.").max(20);

/* ---------- Checkout (shared by the form and the API) ---------- */

export const COUNTRIES = [
  { code: "FR", label: "France" },
  { code: "BE", label: "Belgique" },
  { code: "CH", label: "Suisse" },
  { code: "LU", label: "Luxembourg" },
  { code: "MC", label: "Monaco" },
] as const;

const countryCodes = COUNTRIES.map((c) => c.code) as [string, ...string[]];

export const checkoutCustomerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(3, "Indique ton nom complet.")
      .max(100, "Nom trop long.")
      .refine((v) => v.includes(" "), "Indique ton prénom et ton nom."),
    email: z.string().trim().toLowerCase().pipe(z.email("Adresse e-mail invalide.")),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9 ().-]{8,20}$/, "Numéro de téléphone invalide."),
    address: z.string().trim().min(5, "Adresse trop courte.").max(200),
    address2: z.string().trim().max(200).optional().default(""),
    postalCode: z.string().trim().regex(/^[0-9A-Za-z -]{4,10}$/, "Code postal invalide."),
    city: z.string().trim().min(2, "Indique ta ville.").max(100),
    country: z.enum(countryCodes, { error: "Choisis un pays." }),
    notes: z.string().trim().max(1000, "1000 caractères maximum.").optional().default(""),
  })
  .superRefine((v, ctx) => {
    if (v.country === "FR" && !/^\d{5}$/.test(v.postalCode)) {
      ctx.addIssue({ code: "custom", path: ["postalCode"], message: "Code postal français à 5 chiffres." });
    }
  });

export type CheckoutCustomer = z.input<typeof checkoutCustomerSchema>;

export const orderRequestSchema = z.object({
  idempotencyKey: z.string().regex(/^[A-Za-z0-9-]{16,64}$/, "Clé de requête invalide."),
  lines: cartSchema,
  customer: checkoutCustomerSchema,
  /** Honeypot: must stay empty. */
  website: z.string().max(0).optional().default(""),
});

export const contactSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Adresse e-mail invalide.")),
  message: z.string().trim().min(10, "Ton message est un peu court.").max(3000, "3000 caractères maximum."),
  website: z.string().max(0).optional().default(""),
});

/* ---------- Admin ---------- */

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Adresse e-mail invalide.")),
  password: z.string().min(1, "Mot de passe requis.").max(200),
});

export const productInputSchema = z.object({
  name: z.string().trim().min(2, "Nom requis.").max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug : lettres minuscules, chiffres et tirets."),
  group: z.string().trim().max(60).default(""),
  categoryId: z.union([objectId, z.literal(""), z.null()]).optional(),
  color: z.object({
    name: z.string().trim().max(40).default(""),
    hex: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Couleur hexadécimale (#RRGGBB)."),
  }),
  tagline: z.string().trim().max(200).default(""),
  description: z.string().trim().max(5000).default(""),
  details: z.array(z.string().trim().min(1).max(200)).max(20).default([]),
  material: z.string().trim().max(500).default(""),
  care: z.string().trim().max(500).default(""),
  priceCents: z.number().int().min(0, "Prix invalide.").max(1_000_000),
  compareAtCents: z.number().int().min(0).max(1_000_000).nullable().default(null),
  images: z
    .array(
      z.object({
        url: z
          .string()
          .trim()
          .refine((u) => u.startsWith("/") || /^https:\/\//.test(u), "URL d'image : chemin local ou https://"),
        alt: z.string().trim().max(200).default(""),
        kind: z.enum(["photo", "placeholder"]).default("photo"),
      }),
    )
    .max(12)
    .default([]),
  sizes: z
    .array(
      z.object({
        label: size,
        enabled: z.boolean(),
        stock: z.number().int().min(0).max(100000).nullable(),
      }),
    )
    .max(SIZES.length),
  status: z.enum(["active", "draft", "archived"]),
  bundleEligible: z.boolean(),
  sortOrder: z.number().int().min(0).max(10000).default(0),
  seo: z
    .object({ title: z.string().trim().max(70).default(""), description: z.string().trim().max(170).default("") })
    .default({ title: "", description: "" }),
});
export type ProductInput = z.input<typeof productInputSchema>;

export const settingsSchema = z.object({
  storeName: z.string().trim().min(1).max(60),
  tagline: z.string().trim().max(200),
  contactEmail: z.string().trim().pipe(z.email("Adresse e-mail invalide.")),
  announcement: z.object({ enabled: z.boolean(), text: z.string().trim().max(200) }),
  promotion: z.object({
    enabled: z.boolean(),
    headline: z.string().trim().max(120),
    text: z.string().trim().max(300),
    endsAt: z.string().datetime({ offset: true }).nullable().or(z.literal("").transform(() => null)),
  }),
  bundle: z.object({
    enabled: z.boolean(),
    quantity: z.literal(2),
    priceCents: z.number().int().min(0).max(1_000_000),
    label: z.string().trim().min(1).max(60),
  }),
  shipping: z.object({
    priceCents: z.number().int().min(0).max(100_000),
    summary: z.string().trim().max(200),
    details: z.string().trim().max(3000),
    minDays: z.number().int().min(0).max(60),
    maxDays: z.number().int().min(0).max(60),
  }),
  returns: z.object({ summary: z.string().trim().max(200), details: z.string().trim().max(3000) }),
  orders: z.object({
    acceptingOrders: z.boolean(),
    closedMessage: z.string().trim().max(500),
    paymentNotice: z.string().trim().max(1000),
  }),
  faq: z.array(z.object({ question: z.string().trim().min(3).max(200), answer: z.string().trim().min(3).max(2000) })).max(30),
  sizeRules: z
    .array(z.object({ size, maxScore: z.number().min(0).max(400).nullable() }))
    .length(SIZES.length),
  sizeChart: z
    .array(
      z.object({
        size,
        chest: z.string().trim().max(20),
        waist: z.string().trim().max(20),
        back: z.number().min(0).max(200),
        sleeve: z.number().min(0).max(200),
      }),
    )
    .max(SIZES.length),
  social: z.object({ instagram: z.string().trim().max(200), tiktok: z.string().trim().max(200) }),
});

/** Flattens Zod issues into { "field.path": "message" } for forms. */
export function fieldErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
