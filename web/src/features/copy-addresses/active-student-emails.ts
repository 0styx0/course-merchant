import { studentAccess } from "@/features/student-access/student-access";
import type { AdminCourse } from "@/lib/types";

/** The email addresses of the students whose access reads Active, in the order given. */
export function activeStudentEmails(enrollments: AdminCourse["enrollments"]) {
  return enrollments
    .filter((enrollment) => studentAccess(enrollment).word === "Active")
    .map((enrollment) => enrollment.customer.email);
}
