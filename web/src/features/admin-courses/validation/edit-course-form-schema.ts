import { z } from "zod";

import {
  contentUrlSchema,
  descriptionSchema,
  nameSchema,
  summarySchema,
  timeZoneSchema,
} from "./course-form-schema";

/**
 * What the edit form checks: the details it edits. Start and end times,
 * prices and status are not here yet, so there are no cross-field checks.
 */
export const editCourseFormSchema = z.object({
  name: nameSchema,
  summary: summarySchema,
  description: descriptionSchema,
  contentUrl: contentUrlSchema,
  schedule: z.object({ timeZone: timeZoneSchema }),
});

/** The course's stored start and end, as the UTC strings the API sent. */
export type LoadedSchedule = {
  startTime: string;
  endTime: string;
};

/** The edited details as typed, before the schema checks and trims them. */
export type EditCourseFormValues = z.input<typeof editCourseFormSchema>;
