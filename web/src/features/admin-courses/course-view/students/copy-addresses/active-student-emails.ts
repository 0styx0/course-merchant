import type { AdminCourse } from "@/lib/types";

import { studentAccess } from "../words/access-words";

/** The email addresses of the students whose access reads Active, in the order given. */
export function activeStudentEmails(enrollments: AdminCourse["enrollments"]) {
  return enrollments
    .filter((enrollment) => studentAccess(enrollment).word === "Active")
    .map((enrollment) => enrollment.customer.email);
}
