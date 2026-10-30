import type { AdminCourse, UpdateCourseRequest } from "@/lib/types";

import type { EditCourseFormValues } from "../validation/edit-course-form-schema";

/**
 * The parts of the course the edit form doesn't edit yet. They go back in the
 * save as loaded.
 */
export type FieldsSentBackUnchanged = {
  status: UpdateCourseRequest["status"];
  schedule: Pick<UpdateCourseRequest["schedule"], "startTime" | "endTime">;
  prices: UpdateCourseRequest["prices"];
};

export type EditFormPrefill = {
  values: EditCourseFormValues;
  fieldsSentBackUnchanged: FieldsSentBackUnchanged;
};

/**
 * Picks only what the browser needs from the loaded course: its
 * `enrollments` hold customers' emails and payment details.
 */
export function toEditFormPrefill(course: AdminCourse): EditFormPrefill {
  return {
    values: {
      name: course.name,
      summary: course.summary,
      description: course.description,
      contentUrl: course.contentUrl,
      schedule: { timeZone: course.schedule.timeZone },
    },
    fieldsSentBackUnchanged: {
      status: course.status.name,
      schedule: {
        startTime: course.schedule.startTime,
        endTime: course.schedule.endTime,
      },
      // The API keeps a price that matches a stored one exactly, so no ids.
      prices: course.prices.map(({ amount, currency, effectiveAt }) => ({
        amount,
        currency,
        effectiveAt,
      })),
    },
  };
}
