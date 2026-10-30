"use server";

import { updateCourse } from "../admin-courses.api";
import {
  invalidCourseIdFailure,
  invalidFormFailure,
  isUuid,
  problemFailure,
  successWithCourseId,
  type CourseActionResult,
} from "../course-action-result";
import {
  courseFormSchema,
  type CourseFormValues,
} from "../../validation/course-form-schema";
import { toCourseRequest } from "../to-course-request";

/** Saves the form's values over an existing course, which stays a draft. */
export async function retryDraftSaveAction(
  courseId: string,
  values: CourseFormValues,
): Promise<CourseActionResult> {
  // Anyone can call a Server Action with anything, so check again here.
  if (!isUuid(courseId)) return invalidCourseIdFailure();
  const checked = courseFormSchema.safeParse(values);
  if (!checked.success) return invalidFormFailure(checked.error);

  const result = await updateCourse(
    courseId,
    toCourseRequest(checked.data, "drafted"),
  );
  if (result.state === "failure") return problemFailure(result.error);
  return successWithCourseId(result.data.id);
}
