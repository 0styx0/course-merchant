import type { AdminCourse } from "@/lib/types";

import {
  isFailedEmailToResend,
  isRefundOwedToStudent,
} from "../attention/attention-checks";

type Enrollment = AdminCourse["enrollments"][number];
type AttentionFields = Pick<
  Enrollment,
  "latestEmail" | "refundStatus" | "suspendedAt" | "revokedAt"
>;

const failedEmailLineByKind: Record<Enrollment["latestEmail"]["kind"], string> =
  {
    access_granted: "Course access email failed",
    already_owned: "Already-enrolled email failed",
    access_suspended: "Suspension email failed",
  };

function failedEmailLines(enrollment: AttentionFields) {
  if (!isFailedEmailToResend(enrollment)) return [];
  return [failedEmailLineByKind[enrollment.latestEmail.kind]];
}

function refundOwedLines(enrollment: AttentionFields) {
  return isRefundOwedToStudent(enrollment) ? ["Refund owed"] : [];
}

/**
 * The words of what the owner must act on for one student: a failed email by
 * its kind (skipped once the student is Un-enrolled), then Refund owed (the shop
 * owes the student money back), whatever the student's access, because money
 * owed stays owed after an un-enroll.
 */
export function attentionLineWords(enrollment: AttentionFields): string[] {
  return [...failedEmailLines(enrollment), ...refundOwedLines(enrollment)];
}
