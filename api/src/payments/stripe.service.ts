import { Inject, Injectable } from "@nestjs/common";
import { Temporal } from "@js-temporal/polyfill";
import Stripe from "stripe";

import {
  PAYMENTS_CONFIG,
  type PaymentsConfig,
} from "@/payments/payments-config.js";
import type { RetrievedCheckout } from "./checkout-events.js";
import { retrievedCheckoutFromSession } from "./stripe-events.js";

export const STRIPE_CLIENT = Symbol("STRIPE_CLIENT");

// Webhook payloads follow the endpoint's API version, so the production
// endpoint must be created with this same version. The SDK types `apiVersion`
// as its own version, so an SDK upgrade fails to compile until this is bumped.
const STRIPE_API_VERSION = "2026-09-30.endive";

export function createStripeClient(
  secretKey: string,
  options: Stripe.StripeConfig = {},
): Stripe {
  return new Stripe(secretKey, { ...options, apiVersion: STRIPE_API_VERSION });
}

export const stripeClientProvider = {
  provide: STRIPE_CLIENT,
  inject: [PAYMENTS_CONFIG],
  useFactory: (config: PaymentsConfig) =>
    createStripeClient(config.stripeSecretKey),
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

// why we refund; sent to Stripe as `metadata.refundCause`
export type RefundCause = "double_purchase" | "suspended_access";

export type RefundPaymentInput = {
  // our Payment id. Used as the idempotency key, so a retried call doesn't
  // refund twice
  paymentId: string;
  // Stripe's payment intent for the charge being refunded
  providerPaymentId: string;
  cause: RefundCause;
};

export class PaymentProviderUnavailableError extends Error {
  constructor(options?: { cause?: unknown }) {
    super("Stripe is unavailable.", options);
    this.name = "PaymentProviderUnavailableError";
  }
}

export class InvalidWebhookSignatureError extends Error {
  constructor(options?: { cause?: unknown }) {
    super(
      "The webhook's Stripe-Signature header doesn't match its body.",
      options,
    );
    this.name = "InvalidWebhookSignatureError";
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
    @Inject(PAYMENTS_CONFIG)
    private readonly config: PaymentsConfig,
  ) {}

  /**
   * Checks that a webhook request really came from Stripe and returns its
   * event. The signature covers the exact bytes Stripe sent, so `rawBody`
   * must be the unparsed request body.
   *
   * @throws InvalidWebhookSignatureError when the signature is missing,
   * doesn't match the body, or is too old (the SDK's replay protection)
   */
  verifyWebhookEvent(
    rawBody: Buffer,
    signatureHeader: string | undefined,
  ): Stripe.Event {
    if (!signatureHeader) {
      throw new InvalidWebhookSignatureError();
    }

    try {
      return this.stripe.webhooks.constructEvent(
        rawBody,
        signatureHeader,
        this.config.stripeWebhookSecret,
      );
    } catch (error) {
      if (error instanceof Stripe.errors.StripeSignatureVerificationError) {
        throw new InvalidWebhookSignatureError({ cause: error });
      }

      throw error;
    }
  }

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
      throw new Error(
        `Stripe returned Checkout Session ${session.id} without a URL.`,
      );
    }

    return { id: session.id, url: session.url };
  }

  /**
   * Asks Stripe where a checkout stands, for one whose webhook never arrived.
   *
   * @throws PaymentProviderUnavailableError when Stripe can't be reached or
   * fails on its side, so the caller can retry later
   */
  async retrieveCheckout(
    providerCheckoutId: string,
  ): Promise<RetrievedCheckout> {
    const session = await this.stripe.checkout.sessions
      .retrieve(providerCheckoutId, {
        expand: ["payment_intent.latest_charge"],
      })
      .catch((error: unknown) => {
        if (isStripeOutage(error)) {
          throw new PaymentProviderUnavailableError({ cause: error });
        }

        throw error;
      });

    return retrievedCheckoutFromSession(session);
  }

  /**
   * Refunds a payment in full. Only a double purchase is labelled `duplicate`:
   * none of Stripe's reasons fits a refund for a suspended buyer. A payment
   * that is already fully refunded counts as refunded: Stripe forgets an
   * idempotency key after about a day, so a retry can reach it again.
   *
   * @throws PaymentProviderUnavailableError when Stripe can't be reached or
   * fails on its side, so the caller can retry later
   */
  async refundPayment(input: RefundPaymentInput): Promise<void> {
    await this.stripe.refunds
      .create(
        {
          payment_intent: input.providerPaymentId,
          ...(input.cause === "double_purchase" && { reason: "duplicate" }),
          metadata: { paymentId: input.paymentId, refundCause: input.cause },
        },
        { idempotencyKey: `refund-${input.paymentId}` },
      )
      .catch((error: unknown) => {
        if (isAlreadyRefunded(error)) {
          return;
        }

        if (isStripeOutage(error)) {
          throw new PaymentProviderUnavailableError({ cause: error });
        }

        throw error;
      });
  }
}

// Stripe replaces the literal {CHECKOUT_SESSION_ID} with the session id, so the
// placeholder must not be URL-encoded
function withCheckoutId(successUrl: string): string {
  const separator = successUrl.includes("?") ? "&" : "?";

  return `${successUrl}${separator}checkoutId={CHECKOUT_SESSION_ID}`;
}

function isAlreadyRefunded(error: unknown): boolean {
  return (
    error instanceof Stripe.errors.StripeError &&
    error.code === "charge_already_refunded"
  );
}

function isStripeOutage(error: unknown): boolean {
  return (
    error instanceof Stripe.errors.StripeConnectionError ||
    error instanceof Stripe.errors.StripeAPIError ||
    error instanceof Stripe.errors.StripeRateLimitError
  );
}
