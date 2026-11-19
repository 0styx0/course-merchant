import { studentAccess } from "@/features/student-access/student-access";
import type { AdminCourse } from "@/lib/types";

type Enrollment = AdminCourse["enrollments"][number];
type AttentionFields = Pick<
  Enrollment,
  "latestEmail" | "refundStatus" | "suspendedAt" | "revokedAt"
>;

/**
 * Whether the shop owes this student money back: the student paid for the
 * course and no enrollment uses that payment (a double purchase, say), so the
 * owner must refund it in Stripe. The money stays owed after an un-enroll, so
 * access plays no part.
 */
export function isRefundOwedToStudent({ refundStatus }: AttentionFields) {
  return refundStatus === "owed";
}

function isUnenrolled(enrollment: AttentionFields) {
  return studentAccess(enrollment).word === "Un-enrolled";
}

/**
 * Whether the owner must resend this student's latest email by hand: it
 * failed, and the student still reads as enrolled. The owner has nothing to
 * resend to a student they removed, and the API reads an un-enrolled student
 * with no email as a failed access email, so without the access check every
 * un-enrolled row would need a resend.
 */
export function isFailedEmailToResend(enrollment: AttentionFields) {
  return (
    enrollment.latestEmail.status === "failed" && !isUnenrolled(enrollment)
  );
}
