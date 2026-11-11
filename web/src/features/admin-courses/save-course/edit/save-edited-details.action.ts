"use server";

import { refresh } from "next/cache";

import { toCourseDescription } from "@/features/course-description/description-document";
import { wallClockToUtc } from "@/lib/time/wall-clock-time";

import {
  makeEditCourseFormSchema,
  type EditCourseFormValues,
  type EditedDetailsValues,
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
 * Saves the edited details, the status, the start and end read from the boxes
 * and the edited prices, then refreshes the page. The loaded prices come from
 * the browser; the API refuses any change to a price in effect.
 */
export async function saveEditedDetailsAction(
  courseId: string,
  values: EditedDetailsValues,
  loadedSchedule: LoadedSchedule,
  loadedPrices: LoadedPrices,
): Promise<CourseActionResult> {
  // Anyone can call a Server Action with anything, so check again here.
  if (!isUuid(courseId)) return invalidCourseIdFailure();
  // The image goes up in its own request, so the schema sees none.
  const checked = makeEditCourseFormSchema(
    loadedSchedule,
    loadedPrices,
  ).safeParse({ ...values, image: null });
  if (!checked.success) return invalidFormFailure(checked.error);

  const { data } = checked;
  const { timeZone } = data.schedule;
  const result = await updateCourse(courseId, {
    name: data.name,
    summary: data.summary,
    description: toCourseDescription(data.description),
    contentUrl: data.contentUrl,
    status: data.status,
    schedule: toRequestSchedule(data.schedule),
    prices: toEditedRequestPrices(data.prices, timeZone, loadedPrices),
  });
  if (result.state === "failure") return problemFailure(result.error);
  // The reply carries the reloaded page, so the form holds the stored course
  // before the browser shows "Saved".
  refresh();
  return successWithCourseId(result.data.id);
}
