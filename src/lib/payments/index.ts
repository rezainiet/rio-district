import "server-only";
import { log } from "../log";
import { checkoutPresentation } from "./hosted";

/**
 * Payment integration seam.
 *
 * No provider is active. To add one (Stripe, Mollie, PayPlug, …):
 *  1. Implement `PaymentProvider` in `src/lib/payments/<provider>.ts`.
 *  2. Register it in `getPaymentProvider()` below, keyed by PAYMENT_PROVIDER.
 *  3. Create a checkout session after the order request is stored
 *     (`createSession`), persist a PaymentAttempt, set paymentStatus "pending".
 *  4. Point the provider's webhook at /api/payments/webhook/<provider>; the
 *     route calls `verifyWebhook` and then `applyPaymentEvent`.
 * Orders, cart and pricing never need to change: the order total is already
 * computed server-side and stored in cents.
 */

export type PaymentSession = {
  provider: string;
  providerRef: string;
  /** URL the customer is redirected to, when the provider hosts the payment page. */
  redirectUrl: string | null;
};

export type PaymentEvent = {
  provider: string;
  providerRef: string;
  type: "succeeded" | "failed" | "cancelled" | "pending" | "refunded";
  amountCents: number;
  currency: string;
  raw: unknown;
};

export interface PaymentProvider {
  readonly id: string;
  createSession(input: {
    orderId: string;
    orderNumber: string;
    amountCents: number;
    currency: "EUR";
    customerEmail: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<PaymentSession>;
  /** Must verify the signature and throw on any invalid payload. */
  verifyWebhook(rawBody: string, headers: Headers): Promise<PaymentEvent>;
}

export function getPaymentProvider(): PaymentProvider | null {
  const id = (process.env.PAYMENT_PROVIDER ?? "").trim();
  if (!id || id === "everflow") return null; // Redirect capability has no authenticated event adapter yet.
  // Intentionally empty until the client chooses and tests a provider.
  log.warn("payments.provider_not_implemented", { provider: id });
  return null;
}

export const paymentsEnabled = () => {
  const checkout = checkoutPresentation();
  return (checkout.mode !== "request" && checkout.available) || getPaymentProvider() !== null;
};
