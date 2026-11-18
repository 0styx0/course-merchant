import { Temporal } from "@js-temporal/polyfill";

type StoredEnrollmentTimes = {
  purchasedAt: Temporal.Instant;
  revokedAt: Temporal.Instant | null;
  suspendedAt: Temporal.Instant | null;
};

type EnrollmentTimesResponse = {
  enrolledAt: string;
  revokedAt: string | null;
  suspendedAt: string | null;
};

// any optional stored time as UTC text; the course admin answer also uses it
// for a payment's time
export function formatOptionalDate(
  time: Temporal.Instant | null,
): string | null {
  return time === null ? null : time.toString();
}

/**
 * An enrollment's times as the API sends them, in UTC. The course admin answer
 * and the admin customer list both use it, so they agree on the format. The
 * purchase time is sent as `enrolledAt`, because buying the course enrolls the
 * customer.
 */
export function toEnrollmentTimesResponse(
  enrollment: StoredEnrollmentTimes,
): EnrollmentTimesResponse {
  return {
    enrolledAt: enrollment.purchasedAt.toString(),
    revokedAt: formatOptionalDate(enrollment.revokedAt),
    suspendedAt: formatOptionalDate(enrollment.suspendedAt),
  };
}
