"use server";

import { toCourseDescription } from "@/features/course-description/description-document";

import type { KeptParts } from "../../edit-course/edit-course-start";
import {
  editCourseFormSchema,
  type EditCourseFormValues,
} from "../../validation/edit-course-form-schema";
import { updateCourse } from "../admin-courses.api";
import {
  invalidCourseIdFailure,
  invalidFormFailure,
  isUuid,
  problemFailure,
  successWithCourseId,
  type CourseActionResult,
} from "../course-action-result";

/** Saves the edited details over a course; the kept parts go back as loaded. */
export async function updateCourseDetailsAction(
  courseId: string,
  values: EditCourseFormValues,
  keptParts: KeptParts,
): Promise<CourseActionResult> {
  // Anyone can call a Server Action with anything, so check again here.
  if (!isUuid(courseId)) return invalidCourseIdFailure();
  const checked = editCourseFormSchema.safeParse(values);
  if (!checked.success) return invalidFormFailure(checked.error);

  const { data } = checked;
  const result = await updateCourse(courseId, {
    name: data.name,
    summary: data.summary,
    description: toCourseDescription(data.description),
    contentUrl: data.contentUrl,
    status: keptParts.status,
    schedule: { ...keptParts.schedule, timeZone: data.schedule.timeZone },
    prices: keptParts.prices,
  });
  if (result.state === "failure") return problemFailure(result.error);
  return successWithCourseId(result.data.id);
}
