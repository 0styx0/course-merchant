import { Inject, Injectable } from "@nestjs/common";
import type { Temporal } from "@js-temporal/polyfill";
import Stripe from "stripe";

import { PAYMENTS_CONFIG, type PaymentsConfig } from "@/config/payments-config.js";

export const STRIPE_CLIENT = Symbol("STRIPE_CLIENT");

export const stripeClientProvider = {
  provide: STRIPE_CLIENT,
  inject: [PAYMENTS_CONFIG],
  useFactory: (config: PaymentsConfig) => new Stripe(config.stripeSecretKey),
};

export type CreateCheckoutSessionInput = {
  // our Payment id. Used as the idempotency key, so a retried call returns the
  // same session instead of creating a second one
  paymentId: string;
  // in the currency's smallest unit, e.g. cents
  amount: number;
  currency: string;
  courseName: string;
  customerEmail: string;
  // the session id is added as the `checkoutId` query parameter
  successUrl: string;
  cancelUrl: string;
  // Stripe accepts 30 minutes to 24 hours from now
  expiresAt: Temporal.Instant;
};

export type CreatedCheckoutSession = {
  id: string;
  // Stripe's hosted checkout page
  url: string;
};

export class PaymentProviderUnavailableError extends Error {
  constructor(options?: { cause?: unknown }) {
    super("Stripe is unavailable.", options);
    this.name = "PaymentProviderUnavailableError";
  }
}

/**
 * The only place the app calls Stripe. Services use this rather than the SDK,
 * so tests can replace it and Stripe's request details stay in one file.
 */
@Injectable()
export class StripeService {
  constructor(
    @Inject(STRIPE_CLIENT)
    private readonly stripe: Stripe,
  ) {}

  /**
   * @throws PaymentProviderUnavailableError when Stripe can't be reached or
   * fails on its side, so the caller can ask the buyer to retry
   */
  async createCheckoutSession(
    input: CreateCheckoutSessionInput,
  ): Promise<CreatedCheckoutSession> {
    const session = await this.stripe.checkout.sessions
      .create(
        {
          mode: "payment",
          // cards only: payment is confirmed instantly, so there is never a
          // delayed "processing" state to deliver against
          allowed_payment_method_types: ["card"],
          line_items: [
            {
              quantity: 1,
              price_data: {
                currency: input.currency.toLowerCase(),
                unit_amount: input.amount,
                product_data: { name: input.courseName },
              },
            },
          ],
          customer_email: input.customerEmail,
          client_reference_id: input.paymentId,
          metadata: { paymentId: input.paymentId },
          success_url: withCheckoutId(input.successUrl),
          cancel_url: input.cancelUrl,
          expires_at: Math.floor(input.expiresAt.epochMilliseconds / 1000),
        },
        { idempotencyKey: `checkout-${input.paymentId}` },
      )
      .catch((error: unknown) => {
        if (isStripeOutage(error)) {
          throw new PaymentProviderUnavailableError({ cause: error });
        }

        throw error;
      });

    if (!session.url) {
      throw new Error(`Stripe returned Checkout Session ${session.id} without a URL.`);
    }

    return { id: session.id, url: session.url };
  }
}

// Stripe replaces the literal {CHECKOUT_SESSION_ID} with the session id, so the
// placeholder must not be URL-encoded
function withCheckoutId(successUrl: string): string {
  const separator = successUrl.includes("?") ? "&" : "?";

  return `${successUrl}${separator}checkoutId={CHECKOUT_SESSION_ID}`;
}

function isStripeOutage(error: unknown): boolean {
  return (
    error instanceof Stripe.errors.StripeConnectionError ||
    error instanceof Stripe.errors.StripeAPIError ||
    error instanceof Stripe.errors.StripeRateLimitError
  );
}
