"use server";

import { refresh } from "next/cache";

import { isUuid } from "@/lib/ids/is-uuid";
import type { ProblemDetails, Result } from "@/lib/types";

import { revokeEnrollment } from "../../../api/admin-courses.api";

export type UnenrollStudentResult = Result<null, ProblemDetails>;

const invalidIdsProblem: ProblemDetails = {
  title: "Validation failed",
  detail: "The course or student id is not valid.",
  code: "VALIDATION_FAILED",
};

/**
 * Un-enrolls the student from the course (the API calls this revoking the
 * enrollment, at its `/revocation` address), then refreshes the page so the
 * student list shows the change.
 */
export async function unenrollStudentAction(
  courseId: string,
  customerId: string,
): Promise<UnenrollStudentResult> {
  // Anyone can call a Server Action with anything, so check again here.
  if (!isUuid(courseId) || !isUuid(customerId)) {
    return { state: "failure", error: invalidIdsProblem };
  }
  const result = await revokeEnrollment(courseId, customerId);
  if (result.state === "failure") {
    return { state: "failure", error: result.error };
  }
  // The reply carries the reloaded page, so the row shows the change as soon
  // as the browser gets the result.
  refresh();
  return { state: "success", data: null };
}
