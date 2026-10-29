import { Temporal } from "@js-temporal/polyfill";
import type { CompletedCheckout } from "@/payments/stripe/checkout-events.js";

export const COURSE_ID = "8b0e1f5c-0000-4000-8000-000000000001";
export const CUSTOMER_ID = "8b0e1f5c-0000-4000-8000-000000000002";
export const PAYMENT_ID = "8b0e1f5c-0000-4000-8000-000000000004";
export const GRANTED_ENROLLMENT_ID = "8b0e1f5c-0000-4000-8000-000000000005";

export const paidAt = Temporal.Instant.from("2026-10-21T12:00:00Z");
export const revokedAt = Temporal.Instant.from("2026-10-01T00:00:00Z");
export const suspendedAt = Temporal.Instant.from("2026-10-02T00:00:00Z");

export function makeCheckout(
  overrides: Partial<CompletedCheckout> = {},
): CompletedCheckout {
  return {
    event: {
      provider: "stripe",
      eventId: "evt_test_1",
      type: "checkout.session.completed",
    },
    paymentId: PAYMENT_ID,
    providerCheckoutId: "cs_test_1",
    providerPayment: { id: "pi_test_1", paidAt },
    ...overrides,
  };
}
