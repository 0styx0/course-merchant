import { Temporal } from "@js-temporal/polyfill";
import type Stripe from "stripe";

import type {
  CheckoutCompletion,
  CompletedCheckout,
  ExpiredCheckout,
  RetrievedCheckout,
} from "./checkout-events.js";

/**
 * Reads a `checkout.session.completed` event in our terms. Stripe echoes our
 * Payment id back as `client_reference_id`, and `event.created` is when the
 * buyer paid, even if the webhook arrives late.
 */
export function completedCheckoutFromEvent(
  event: Stripe.CheckoutSessionCompletedEvent,
): CompletedCheckout {
  const session = event.data.object;

  return {
    event: { provider: "stripe", eventId: event.id, type: event.type },
    paymentId: session.client_reference_id,
    providerCheckoutId: session.id,
    providerPayment: paymentFromEvent(event),
  };
}

function paymentFromEvent(
  event: Stripe.CheckoutSessionCompletedEvent,
): CheckoutCompletion["providerPayment"] {
  const session = event.data.object;

  if (session.payment_status !== "paid") {
    return null;
  }

  return {
    id: paymentIntentId(session),
    paidAt: Temporal.Instant.fromEpochMilliseconds(event.created * 1000),
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

/**
 * Reads a Checkout Session fetched with `payment_intent.latest_charge`
 * expanded, in our terms. With no event to date it, the charge's creation
 * time is when the buyer paid.
 */
export function retrievedCheckoutFromSession(
  session: Stripe.Checkout.Session,
): RetrievedCheckout {
  if (session.status === "expired") {
    return { state: "expired" };
  }

  if (session.status !== "complete") {
    return { state: "open" };
  }

  return {
    state: "completed",
    completion: {
      paymentId: session.client_reference_id,
      providerCheckoutId: session.id,
      providerPayment: paymentFromSession(session),
    },
  };
}

function paymentFromSession(
  session: Stripe.Checkout.Session,
): CheckoutCompletion["providerPayment"] {
  if (session.payment_status !== "paid") {
    return null;
  }

  return { id: paymentIntentId(session), paidAt: chargeTime(session) };
}

// the session was fetched with the charge expanded, so it is an object
function chargeTime(session: Stripe.Checkout.Session): Temporal.Instant {
  const paymentIntent = session.payment_intent;
  const charge =
    typeof paymentIntent === "object" ? paymentIntent?.latest_charge : null;

  if (typeof charge !== "object" || charge === null) {
    throw new Error(
      `Stripe reported Checkout Session ${session.id} as paid without a charge.`,
    );
  }

  return Temporal.Instant.fromEpochMilliseconds(charge.created * 1000);
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
