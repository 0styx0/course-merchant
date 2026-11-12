export type EnrollWords = {
  open: string;
  send: string;
  sending: string;
  /** The send label after a failure a second press can fix; absent for a free course. */
  retry?: string;
};

export function makeEnrollWords(priceLabel: string | undefined): EnrollWords {
  if (priceLabel === undefined) {
    return {
      open: "Enroll for free",
      send: "Email me the link",
      sending: "Sending…",
    };
  }
  return {
    open: `Enroll for ${priceLabel}`,
    send: "Continue to payment",
    sending: "Opening payment…",
    retry: "Try again",
  };
}

const RETRYABLE_PROBLEM_CODES = new Set([
  "PAYMENT_PROVIDER_UNAVAILABLE",
  "INTERNAL_SERVER_ERROR",
  "API_UNREACHABLE",
]);

export function isRetryableProblemCode(
  problemCode: string | undefined,
): boolean {
  return problemCode !== undefined && RETRYABLE_PROBLEM_CODES.has(problemCode);
}
