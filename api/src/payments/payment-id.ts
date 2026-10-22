import { z } from "zod";

// any 8-4-4-4-12 hex id, which is what postgres accepts for a uuid column
const paymentIdSchema = z.guid();

/**
 * Whether a provider-echoed id could be one of ours. A non-uuid id would make
 * Postgres reject the query, and the provider would retry the event for days,
 * so callers treat it as unknown instead.
 */
export function isOurPaymentId(paymentId: string | null): paymentId is string {
  return paymentIdSchema.safeParse(paymentId).success;
}
