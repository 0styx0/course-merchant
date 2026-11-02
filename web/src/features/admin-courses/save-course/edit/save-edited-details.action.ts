"use server";

import { toCourseDescription } from "@/features/course-description/description-document";

import type { FieldsSentBackUnchanged } from "../../edit-course/edit-form-prefill";
import { wallClockToUtc } from "../../schedule/wall-clock-time";
import {
  makeEditCourseFormSchema,
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

// The schema has already refused a time that doesn't convert, so a failure here is a bug.
function boxesToUtc(date: string, timeOfDay: string, timeZone: string) {
  const result = wallClockToUtc(`${date}T${timeOfDay}`, timeZone);
  if (result.state === "failure") {
    throw new Error(`Checked time failed to convert: ${result.error}`);
  }
  return result.data;
}

/** Saves the edited details and the start and end read from the boxes; the fields the form cannot edit yet go back as loaded. */
export async function saveEditedDetailsAction(
  courseId: string,
  values: EditCourseFormValues,
  loadedSchedule: LoadedSchedule,
  fieldsSentBackUnchanged: FieldsSentBackUnchanged,
): Promise<CourseActionResult> {
  // Anyone can call a Server Action with anything, so check again here.
  if (!isUuid(courseId)) return invalidCourseIdFailure();
  const checked = makeEditCourseFormSchema(loadedSchedule).safeParse(values);
  if (!checked.success) return invalidFormFailure(checked.error);

  const { data } = checked;
  const { schedule } = data;
  const startTime = boxesToUtc(
    schedule.startDate,
    schedule.startTimeOfDay,
    schedule.timeZone,
  );
  const endTime = boxesToUtc(
    schedule.endDate,
    schedule.endTimeOfDay,
    schedule.timeZone,
  );
  const result = await updateCourse(courseId, {
    name: data.name,
    summary: data.summary,
    description: toCourseDescription(data.description),
    contentUrl: data.contentUrl,
    status: fieldsSentBackUnchanged.status,
    schedule: {
      startTime,
      endTime,
      timeZone: schedule.timeZone,
    },
    prices: fieldsSentBackUnchanged.prices,
  });
  if (result.state === "failure") return problemFailure(result.error);
  return successWithCourseId(result.data.id);
}
