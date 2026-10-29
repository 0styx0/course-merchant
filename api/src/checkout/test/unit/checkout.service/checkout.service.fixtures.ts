import { Temporal } from "@js-temporal/polyfill";

import type { StartCheckoutRequest } from "types.js";
import { type CheckoutCourse } from "@/checkout/checkout.repository.js";
import type { PaymentsConfig } from "@/payments/payments-config.js";

export const COURSE_ID = "8b0e1f5c-0000-4000-8000-000000000001";
export const CUSTOMER_ID = "8b0e1f5c-0000-4000-8000-000000000002";
const PRICE_ID = "8b0e1f5c-0000-4000-8000-000000000003";
export const PAYMENT_ID = "8b0e1f5c-0000-4000-8000-000000000004";
export const GRANTED_ENROLLMENT_ID = "8b0e1f5c-0000-4000-8000-000000000005";

export const config: PaymentsConfig = {
  stripeSecretKey: "sk_test_unit",
  stripeWebhookSecret: "whsec_unit",
  webBaseUrl: "https://courses.example.com",
};

export const request: StartCheckoutRequest = {
  courseId: COURSE_ID,
  customer: { name: "Ada Lovelace", email: "ada@example.com" },
};

export function makeCourse(
  overrides: { amount?: number; endsAt?: Temporal.Instant } = {},
): CheckoutCourse {
  return {
    id: COURSE_ID,
    title: "React Fundamentals",
    endsAt: overrides.endsAt ?? Temporal.Now.instant().add({ hours: 26 }),
    currentPrice: {
      id: PRICE_ID,
      amount: overrides.amount ?? 0,
      currency: "USD",
    },
  };
}

export const suspendedAt = Temporal.Instant.from("2026-10-02T00:00:00Z");
