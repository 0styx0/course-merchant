import type { Temporal } from "@js-temporal/polyfill";

import type { ProviderEvent } from "../payments.repository.js";

/**
 * What a completed checkout says about its payment, however we learned of it:
 * from a webhook event, or by retrieving the checkout from the provider.
 */
export type CheckoutCompletion = {
  // our Payment id, echoed back by the provider. Null when the checkout
  // wasn't started by us
  paymentId: string | null;
  providerCheckoutId: string;
  // null when the checkout completed without the payment being taken
  providerPayment: { id: string; paidAt: Temporal.Instant } | null;
};

/**
 * A checkout the provider reports as completed, in our terms, so the webhook
 * and the sweeper can fulfill it the same way.
 */
export type CompletedCheckout = CheckoutCompletion & {
  event: ProviderEvent;
};

/**
 * A checkout as the provider reports it when asked, which is how the sweeper
 * finds out about one whose webhook never arrived.
 */
export type RetrievedCheckout =
  // the buyer can still pay
  | { state: "open" }
  // the buyer left without paying
  | { state: "expired" }
  | { state: "completed"; completion: CheckoutCompletion };

/**
 * A checkout the provider reports as expired, in our terms: the buyer left
 * without paying.
 */
export type ExpiredCheckout = {
  event: ProviderEvent;
  // our Payment id, echoed back by the provider. Null when the checkout
  // wasn't started by us
  paymentId: string | null;
};
