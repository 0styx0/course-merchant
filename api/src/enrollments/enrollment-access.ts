import type { Temporal } from "@js-temporal/polyfill";

export enum EnrollmentAccess {
  // no enrollment: the buyer can check out
  NONE = "NONE",
  ACTIVE = "ACTIVE",
  // fully refunded: the buyer can buy again
  REVOKED = "REVOKED",
  // a payment dispute: blocked until the owner restores access by hand
  SUSPENDED = "SUSPENDED",
}

type EnrollmentAccessFields = {
  revokedAt: Temporal.Instant | null;
  suspendedAt: Temporal.Instant | null;
};

export function enrollmentAccess(
  enrollment: EnrollmentAccessFields | null,
): EnrollmentAccess {
  if (!enrollment) {
    return EnrollmentAccess.NONE;
  }

  // a suspension blocks the buyer even if the payment was also refunded
  if (enrollment.suspendedAt) {
    return EnrollmentAccess.SUSPENDED;
  }

  return enrollment.revokedAt
    ? EnrollmentAccess.REVOKED
    : EnrollmentAccess.ACTIVE;
}
