"use server";

import { toCourseDescription } from "@/features/course-description/description-document";

import type { FieldsSentBackUnchanged } from "../../edit-course/edit-form-prefill";
import {
  editCourseFormSchema,
  type EditCourseFormValues,
  type LoadedSchedule,
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

/** Saves the edited details over a course; the loaded start and end and the fields it cannot edit yet go back as loaded. */
export async function saveEditedDetailsAction(
  courseId: string,
  values: EditCourseFormValues,
  loadedSchedule: LoadedSchedule,
  fieldsSentBackUnchanged: FieldsSentBackUnchanged,
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
    status: fieldsSentBackUnchanged.status,
    schedule: {
      ...loadedSchedule,
      timeZone: data.schedule.timeZone,
    },
    prices: fieldsSentBackUnchanged.prices,
  });
  if (result.state === "failure") return problemFailure(result.error);
  return successWithCourseId(result.data.id);
}
