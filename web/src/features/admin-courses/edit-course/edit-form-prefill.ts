import { utcToWallClock } from "../schedule/wall-clock-time";
import type { AdminCourse, UpdateCourseRequest } from "@/lib/types";

import type {
  EditCourseFormValues,
  LoadedSchedule,
} from "../validation/edit-course-form-schema";

/**
 * The parts of the course the edit form doesn't edit yet. They go back in the
 * save as loaded.
 */
export type FieldsSentBackUnchanged = {
  status: UpdateCourseRequest["status"];
  prices: UpdateCourseRequest["prices"];
};

export type EditFormPrefill = {
  values: EditCourseFormValues;
  loadedSchedule: LoadedSchedule;
  fieldsSentBackUnchanged: FieldsSentBackUnchanged;
};

// A stored zone the list lacks shows its times in UTC; the zone field reports the zone.
function storedTimeBoxes(utc: string, timeZone: string) {
  const wallClock = utcToWallClock(utc, timeZone) ?? utcToWallClock(utc, "UTC");
  return { date: wallClock?.date ?? "", timeOfDay: wallClock?.timeOfDay ?? "" };
}

/**
 * Picks only what the browser needs from the loaded course: its
 * `enrollments` hold customers' emails and payment details.
 */
export function toEditFormPrefill(course: AdminCourse): EditFormPrefill {
  const { startTime, endTime, timeZone } = course.schedule;
  const start = storedTimeBoxes(startTime, timeZone);
  const end = storedTimeBoxes(endTime, timeZone);
  return {
    values: {
      name: course.name,
      summary: course.summary,
      description: course.description,
      contentUrl: course.contentUrl,
      schedule: {
        timeZone,
        startDate: start.date,
        startTimeOfDay: start.timeOfDay,
        endDate: end.date,
        endTimeOfDay: end.timeOfDay,
      },
    },
    loadedSchedule: { startTime, endTime },
    fieldsSentBackUnchanged: {
      status: course.status.name,
      // The API keeps a price that matches a stored one exactly, so no ids.
      prices: course.prices.map(({ amount, currency, effectiveAt }) => ({
        amount,
        currency,
        effectiveAt,
      })),
    },
  };
}
