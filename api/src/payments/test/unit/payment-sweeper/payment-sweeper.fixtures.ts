import { Temporal } from "@js-temporal/polyfill";
import {
  type OrphanPayment,
  type StalePendingPayment,
} from "@/payments/payments.repository.js";

export const now = Temporal.Instant.from("2026-10-26T12:00:00Z");

export const orphan: OrphanPayment = {
  id: "8b0e1f5c-0000-4000-8000-000000000004",
  courseId: "8b0e1f5c-0000-4000-8000-000000000001",
  customerId: "8b0e1f5c-0000-4000-8000-000000000002",
  providerPaymentId: "pi_test_1",
};

export const pending: StalePendingPayment = {
  id: "8b0e1f5c-0000-4000-8000-000000000005",
  providerCheckoutId: "cs_test_1",
};
