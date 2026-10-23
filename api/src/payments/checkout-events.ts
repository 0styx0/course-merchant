import type { Temporal } from "@js-temporal/polyfill";

import type { ProviderEvent } from "./payments.repository.js";

/**
 * A checkout the provider reports as completed, in our terms, so the webhook
 * and (later) the sweeper can fulfill it the same way.
 */
export type CompletedCheckout = {
  event: ProviderEvent;
  // our Payment id, echoed back by the provider. Null when the checkout
  // wasn't started by us
  paymentId: string | null;
  providerCheckoutId: string;
  // null when the checkout completed without the payment being taken
  providerPayment: { id: string; paidAt: Temporal.Instant } | null;
};

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
