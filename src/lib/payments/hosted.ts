import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { connectDB } from "../db";
import { Order, type OrderDoc } from "@/models/Order";
import { PaymentAttempt } from "@/models/misc";
import { buildEverflowUrl, eligibleOffer, HostedCheckoutError, type CheckoutPresentation, type EverflowConfig, type PrefillOrder } from "./everflow";
import { activeEverflowConfig, forwardingFlag } from "./forwarding-flag";

export function checkoutPresentation(): CheckoutPresentation {
  const selected = forwardingFlag().enabled;
  if (!selected) return { mode: "request", available: true, advertising: false };
  try {
    const config = activeEverflowConfig()!;
    return { mode: config.mode, available: true, advertising: Boolean(config.pixel) };
  } catch (error) {
    return { mode: process.env.EVERFLOW_MODE === "mock" ? "mock" : "live", available: false, advertising: false,
      error: error instanceof HostedCheckoutError ? error.message : "Paiement externe indisponible." };
  }
}

/** Pure preflight is also called before Order and stock creation. */
export function validateHostedOrder(order: PrefillOrder, config: EverflowConfig) {
  buildEverflowUrl(order, config, "preflight-reference", false);
}

/** One opaque backend attempt per order. No external URL/PII is persisted or logged. */
export async function issueHostedCheckout(order: OrderDoc, config: EverflowConfig) {
  if (!forwardingFlag().enabled) throw new HostedCheckoutError("La redirection de paiement est désactivée par la boutique.");
  await connectDB();
  const current = await Order.findById(order._id).lean<OrderDoc>();
  if (!current || current.creationState === "preparing" || current.status === "cancelled" || current.status === "fulfilled" ||
    current.payment?.provider !== "everflow" || current.paymentStatus !== "pending") {
    throw new HostedCheckoutError("Cette commande ne peut pas être relancée. Vérifie son statut ou contacte la boutique avant un autre paiement.");
  }
  validateHostedOrder(current, config);
  const offer = eligibleOffer(current);
  // Keep attribution/pixel/asset settings immutable across retries of one attempt.
  const configurationHash = createHash("sha256").update(JSON.stringify(config)).digest("hex");
  // Index creation is awaited: uniqueness must hold on a fresh database as well.
  await PaymentAttempt.init();
  let attempt;
  try {
    attempt = await PaymentAttempt.findOneAndUpdate({ order: current._id, provider: "everflow", kind: "redirect" }, {
      $setOnInsert: { providerRef: randomBytes(24).toString("base64url"), status: "pending", amountCents: current.totalCents,
        currency: current.currency, mode: config.mode, offer, configurationHash, raw: null },
    }, { upsert: true, returnDocument: "after", setDefaultsOnInsert: true });
  } catch (error) {
    if ((error as { code?: number }).code !== 11000) throw error;
    attempt = await PaymentAttempt.findOne({ order: current._id, provider: "everflow", kind: "redirect" });
  }
  if (!attempt || attempt.configurationHash !== configurationHash || attempt.mode !== config.mode || attempt.status !== "pending" || attempt.amountCents !== current.totalCents || attempt.currency !== current.currency || attempt.offer !== offer) {
    throw new HostedCheckoutError("La configuration de cette tentative a changé. Contacte la boutique pour la rapprocher avant de réessayer.");
  }
  const externalUrl = buildEverflowUrl(current, config, attempt.providerRef, current.marketingConsent === true);
  // Mock never returns the PII-bearing URL to the browser or follows the provider.
  const redirectUrl = config.mode === "mock" ? `/commande/paiement-test/${current.publicToken}` : externalUrl;
  const issued = await PaymentAttempt.findByIdAndUpdate(attempt._id, { $inc: { redirectCount: 1 }, $set: {
    redirectIssuedAt: new Date(), correlationSent: config.mode === "live" && config.sub1Mode === "correlation",
  } }, { returnDocument: "after" });
  if (issued?.redirectCount === 1) await Order.updateOne({ _id: current._id }, { $push: { history: { type: "checkout", by: "everflow",
    message: config.mode === "mock" ? "Redirection simulée localement ; aucun paiement réalisé." : "Redirection préparée ; arrivée chez le partenaire et paiement non vérifiés." } } });
  return { redirectUrl, mode: config.mode, offer, paymentStatus: "pending" as const };
}
