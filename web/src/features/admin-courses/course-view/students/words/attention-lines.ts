import type { AdminCourse } from "@/lib/types";

import { studentAccess } from "./access-words";

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

/**
 * The owner has nothing to resend to a student they removed, so a failed
 * email stops needing action once access reads Un-enrolled. The API also
 * reads an un-enrolled student with no email as a failed access email, so
 * without this check every un-enrolled row would show one.
 */
function isUnenrolled(enrollment: AttentionFields) {
  return studentAccess(enrollment).word === "Un-enrolled";
}

function failedEmailLines(enrollment: AttentionFields) {
  const { latestEmail } = enrollment;
  if (latestEmail.status !== "failed") return [];
  if (isUnenrolled(enrollment)) return [];
  return [failedEmailLineByKind[latestEmail.kind]];
}

function refundOwedLines({ refundStatus }: AttentionFields) {
  return refundStatus === "owed" ? ["Refund owed"] : [];
}

/**
 * The words of what the owner must act on for one student: a failed email by
 * its kind (skipped once the student is Un-enrolled), then Refund owed, whatever
 * the student's access, because money owed stays owed after an un-enroll.
 */
export function attentionLineWords(enrollment: AttentionFields): string[] {
  return [...failedEmailLines(enrollment), ...refundOwedLines(enrollment)];
}
