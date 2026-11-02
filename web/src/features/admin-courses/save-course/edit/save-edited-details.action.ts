"use server";

import { toCourseDescription } from "@/features/course-description/description-document";

import type { FieldsSentBackUnchanged } from "../../edit-course/edit-form-prefill";
import { wallClockToUtc } from "../../schedule/wall-clock-time";
import {
  makeEditCourseFormSchema,
  type EditCourseFormValues,
  type LoadedPrice,
  type LoadedPrices,
  type LoadedSchedule,
} from "../../validation/edit-course-form-schema";
import { findLoadedFuturePrice } from "../../validation/price-row-issues";
import { updateCourse } from "../admin-courses.api";
import { toScheduledPrice } from "../to-course-request";
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

function toRequestSchedule(schedule: EditCourseFormValues["schedule"]) {
  const { timeZone } = schedule;
  return {
    startTime: boxesToUtc(
      schedule.startDate,
      schedule.startTimeOfDay,
      timeZone,
    ),
    endTime: boxesToUtc(schedule.endDate, schedule.endTimeOfDay, timeZone),
    timeZone,
  };
}

type CheckedPriceRow = Parameters<typeof toScheduledPrice>[0];

// The API keeps a price sent exactly as stored, so an untouched row goes as loaded.
function toEditedRequestPrice(
  row: CheckedPriceRow,
  timeZone: string,
  loadedPrices: LoadedPrices,
  nowMs: number,
): LoadedPrice {
  if (!row.effectiveDate) return toScheduledPrice(row, timeZone, nowMs);
  const rowTimeMs = Date.parse(
    boxesToUtc(row.effectiveDate, row.effectiveTimeOfDay, timeZone),
  );
  const loadedFuturePrice = findLoadedFuturePrice(
    row.amountDollars,
    rowTimeMs,
    loadedPrices.future,
  );
  return loadedFuturePrice ?? toScheduledPrice(row, timeZone, nowMs);
}

/** The rows first, so the API's `/prices/N` errors land on row N; then the prices in effect as loaded. */
function toEditedRequestPrices(
  rows: CheckedPriceRow[],
  timeZone: string,
  loadedPrices: LoadedPrices,
): LoadedPrice[] {
  const nowMs = Date.now();
  return [
    ...rows.map((row) =>
      toEditedRequestPrice(row, timeZone, loadedPrices, nowMs),
    ),
    ...loadedPrices.inEffect,
  ];
}

/**
 * Saves the edited details, the start and end read from the boxes and the
 * edited prices; the fields the form cannot edit yet go back as loaded.
 * The loaded prices come from the browser, as the status does; the API refuses
 * any change to a price in effect.
 */
export async function saveEditedDetailsAction(
  courseId: string,
  values: EditCourseFormValues,
  loadedSchedule: LoadedSchedule,
  loadedPrices: LoadedPrices,
  fieldsSentBackUnchanged: FieldsSentBackUnchanged,
): Promise<CourseActionResult> {
  // Anyone can call a Server Action with anything, so check again here.
  if (!isUuid(courseId)) return invalidCourseIdFailure();
  const checked = makeEditCourseFormSchema(
    loadedSchedule,
    loadedPrices,
  ).safeParse(values);
  if (!checked.success) return invalidFormFailure(checked.error);

  const { data } = checked;
  const { timeZone } = data.schedule;
  const result = await updateCourse(courseId, {
    name: data.name,
    summary: data.summary,
    description: toCourseDescription(data.description),
    contentUrl: data.contentUrl,
    status: fieldsSentBackUnchanged.status,
    schedule: toRequestSchedule(data.schedule),
    prices: toEditedRequestPrices(data.prices, timeZone, loadedPrices),
  });
  if (result.state === "failure") return problemFailure(result.error);
  return successWithCourseId(result.data.id);
}
