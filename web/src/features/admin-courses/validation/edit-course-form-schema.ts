import { z } from "zod";

import type { UpdateCourseRequest } from "@/lib/types";

import {
  contentUrlSchema,
  descriptionSchema,
  nameSchema,
  priceRowSchema,
  scheduleBoxesSchema,
  summarySchema,
  timeZoneSchema,
} from "./course-form-schema";
import { editScheduleIssues } from "./edit-schedule-issues";
import { issueAt, type FormIssue } from "./form-issue-and-time-conversion";
import { priceRowIssues } from "./price-row-issues";

const editFieldsSchema = z.object({
  name: nameSchema,
  summary: summarySchema,
  description: descriptionSchema,
  contentUrl: contentUrlSchema,
  schedule: z.object({ ...scheduleBoxesSchema, timeZone: timeZoneSchema }),
  prices: z.array(priceRowSchema),
});

/** The course's stored start and end, as the UTC strings the API sent. */
export type LoadedSchedule = {
  startTime: string;
  endTime: string;
};

/** A stored price as the save sends it back: no id. */
export type LoadedPrice = UpdateCourseRequest["prices"][number];

/**
 * The course's stored prices, split when the page rendered: those that had
 * started (read-only) and those still to come (the price rows' starting point).
 */
export type LoadedPrices = {
  inEffect: LoadedPrice[];
  future: LoadedPrice[];
};

/** The edited details as typed, before the schema checks and trims them. */
export type EditCourseFormValues = z.input<typeof editFieldsSchema>;

type CheckedEditFields = z.output<typeof editFieldsSchema>;

// A course with a price in effect keeps it, so it may have no rows.
function noPriceIssues(
  values: CheckedEditFields,
  loadedPrices: LoadedPrices,
): FormIssue[] {
  if (values.prices.length > 0 || loadedPrices.inEffect.length > 0) return [];
  return [issueAt(["prices"], "Add at least one price.")];
}

function editCrossFieldIssues(
  values: CheckedEditFields,
  loadedSchedule: LoadedSchedule,
  loadedPrices: LoadedPrices,
): FormIssue[] {
  const nowMs = Date.now();
  return [
    ...editScheduleIssues(values.schedule, loadedSchedule, nowMs),
    ...priceRowIssues(values.prices, {
      timeZone: values.schedule.timeZone,
      nowMs,
      loadedFuturePrices: loadedPrices.future,
      emptyStartWords: "when you save",
    }),
    ...noPriceIssues(values, loadedPrices),
  ];
}

/**
 * What the edit form checks: the details it edits, the start and end against
 * the stored ones, and the price rows against the loaded future prices (an
 * unchanged time may be in the past). Built for each course, because those differ.
 */
export function makeEditCourseFormSchema(
  loadedSchedule: LoadedSchedule,
  loadedPrices: LoadedPrices,
) {
  return editFieldsSchema.check(
    (ctx: z.core.ParsePayload<CheckedEditFields>) => {
      const issues = editCrossFieldIssues(
        ctx.value,
        loadedSchedule,
        loadedPrices,
      );
      for (const issue of issues) {
        ctx.issues.push({ code: "custom", input: ctx.value, ...issue });
      }
    },
  );
}
