import "server-only";

import { notFound } from "next/navigation";

import { isCourseMissingProblem } from "@/lib/api/is-course-missing-problem";
import { getCourseAsAdmin, type SaveCourseResult } from "./admin-courses.api";

/**
 * The admin course answer for a page that shows one course. A course the API
 * doesn't know shows Next's 404 page; any other problem comes back for the
 * page to show in its own frame.
 */
export async function getAdminCourseOrNotFound(
  courseId: string,
): Promise<SaveCourseResult> {
  const result = await getCourseAsAdmin(courseId);
  if (result.state === "failure" && isCourseMissingProblem(result.error)) {
    notFound();
  }
  return result;
}
