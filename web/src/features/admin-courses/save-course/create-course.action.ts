"use server";

import { createCourse } from "./admin-courses.api";
import {
  invalidFormFailure,
  problemFailure,
  successWithCourseId,
  type CourseActionResult,
} from "./course-action-result";
import {
  courseFormSchema,
  type CourseFormValues,
} from "../validation/course-form-schema";
import { toCourseRequest } from "./to-course-request";

/** Saves the form as a drafted course. */
export async function createCourseAction(
  values: CourseFormValues,
): Promise<CourseActionResult> {
  // Anyone can call a Server Action with anything, so check again here.
  const checked = courseFormSchema.safeParse(values);
  if (!checked.success) return invalidFormFailure(checked.error);

  const result = await createCourse(toCourseRequest(checked.data, "drafted"));
  if (result.state === "failure") return problemFailure(result.error);
  return successWithCourseId(result.data.id);
}
