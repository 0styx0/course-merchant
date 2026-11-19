import { studentAccess } from "@/features/student-access/student-access";
import type { AdminCourse } from "@/lib/types";

import {
  isFailedEmailToResend,
  isRefundOwedToStudent,
} from "../attention/attention-checks";

type Enrollment = AdminCourse["enrollments"][number];

/** The orders the admin can put the Students list in. */
export type StudentOrder = "newest" | "oldest" | "active" | "attention";

/** Below zero lists the first student before the second. */
type CompareStudents = (first: Enrollment, second: Enrollment) => number;

function enrolledTime(enrollment: Enrollment) {
  return Date.parse(enrollment.enrolledAt);
}

function compareNewestFirst(first: Enrollment, second: Enrollment) {
  return enrolledTime(second) - enrolledTime(first);
}

function compareOldestFirst(first: Enrollment, second: Enrollment) {
  return enrolledTime(first) - enrolledTime(second);
}

function activeRank(enrollment: Enrollment) {
  return studentAccess(enrollment).word === "Active" ? 0 : 1;
}

/**
 * A refund the shop owes the student first, then a failed email the owner
 * must resend, then the rest; the same checks decide the row's Attention
 * lines, so the ranking matches what the admin sees.
 */
function attentionRank(enrollment: Enrollment) {
  if (isRefundOwedToStudent(enrollment)) return 0;
  return isFailedEmailToResend(enrollment) ? 1 : 2;
}

/**
 * Lists the students with the lower group number first, and within a group
 * the newest enrolled student first.
 */
function makeGroupedNewestFirstComparer(
  groupRank: (enrollment: Enrollment) => number,
): CompareStudents {
  return (first, second) =>
    groupRank(first) - groupRank(second) || compareNewestFirst(first, second);
}

const compareStudentsByOrder: Record<StudentOrder, CompareStudents> = {
  newest: compareNewestFirst,
  oldest: compareOldestFirst,
  active: makeGroupedNewestFirstComparer(activeRank),
  attention: makeGroupedNewestFirstComparer(attentionRank),
};

/**
 * A new list of the students in the chosen order; the input stays as it was.
 * Students who enrolled at the same time keep the API's order, because the
 * sort is stable.
 */
export function studentsInOrder(
  enrollments: readonly Enrollment[],
  order: StudentOrder,
): Enrollment[] {
  return enrollments.toSorted(compareStudentsByOrder[order]);
}
