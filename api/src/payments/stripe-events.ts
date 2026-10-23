import { Temporal } from "@js-temporal/polyfill";
import type Stripe from "stripe";

import type { CompletedCheckout, ExpiredCheckout } from "./checkout-events.js";

/**
 * Reads a `checkout.session.completed` event in our terms. Stripe echoes our
 * Payment id back as `client_reference_id`, and `event.created` is when the
 * buyer paid, even if the webhook arrives late.
 */
export function completedCheckoutFromEvent(
  event: Stripe.CheckoutSessionCompletedEvent,
): CompletedCheckout {
  const session = event.data.object;
  const isPaid = session.payment_status === "paid";

  return {
    event: { provider: "stripe", eventId: event.id, type: event.type },
    paymentId: session.client_reference_id,
    providerCheckoutId: session.id,
    providerPayment: isPaid
      ? {
          id: paymentIntentId(session),
          paidAt: Temporal.Instant.fromEpochMilliseconds(event.created * 1000),
        }
      : null,
  };
}

/** Reads a `checkout.session.expired` event in our terms. */
export function expiredCheckoutFromEvent(
  event: Stripe.CheckoutSessionExpiredEvent,
): ExpiredCheckout {
  return {
    event: { provider: "stripe", eventId: event.id, type: event.type },
    paymentId: event.data.object.client_reference_id,
  };
}

// a paid session in payment mode always has a payment intent; it arrives as an
// id unless the caller expanded it
function paymentIntentId(session: Stripe.Checkout.Session): string {
  const paymentIntent = session.payment_intent;

  if (!paymentIntent) {
    throw new Error(
      `Stripe reported Checkout Session ${session.id} as paid without a payment intent.`,
    );
  }

  return typeof paymentIntent === "string" ? paymentIntent : paymentIntent.id;
}
