import { z } from "zod";

import {
  contentUrlSchema,
  descriptionSchema,
  nameSchema,
  scheduleBoxesSchema,
  summarySchema,
  timeZoneSchema,
} from "./course-form-schema";
import { editScheduleIssues } from "./edit-schedule-issues";

const editFieldsSchema = z.object({
  name: nameSchema,
  summary: summarySchema,
  description: descriptionSchema,
  contentUrl: contentUrlSchema,
  schedule: z.object({ ...scheduleBoxesSchema, timeZone: timeZoneSchema }),
});

/** The course's stored start and end, as the UTC strings the API sent. */
export type LoadedSchedule = {
  startTime: string;
  endTime: string;
};

/** The edited details as typed, before the schema checks and trims them. */
export type EditCourseFormValues = z.input<typeof editFieldsSchema>;

type CheckedEditFields = z.output<typeof editFieldsSchema>;

/**
 * What the edit form checks: the details it edits, and the start and end
 * against the course's stored ones (an unchanged time may be in the past).
 * Built for each course, because the stored times differ.
 */
export function makeEditCourseFormSchema(loadedSchedule: LoadedSchedule) {
  return editFieldsSchema.check(
    (ctx: z.core.ParsePayload<CheckedEditFields>) => {
      for (const issue of editScheduleIssues(
        ctx.value.schedule,
        loadedSchedule,
        Date.now(),
      )) {
        ctx.issues.push({ code: "custom", input: ctx.value, ...issue });
      }
    },
  );
}
