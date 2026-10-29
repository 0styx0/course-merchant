import { toCourseDescription } from "@/features/courses/description-document";
import type { CreateCourseRequest, CreateCourseStatus } from "@/lib/types";

import { COURSE_CURRENCY, MIN_PRICE_LEAD_MS } from "./course-form-limits";
import {
  normalizeDollars,
  type CheckedCourseFormValues,
} from "./course-form-schema";
import { wallClockToUtc } from "./wall-clock-time";

type Schedule = CheckedCourseFormValues["schedule"];
type Price = CheckedCourseFormValues["prices"][number];

/**
 * Builds the API request from values the form schema has already accepted, so
 * a time that can't be converted is a bug in the caller and throws.
 */
export function toCourseRequest(
  values: CheckedCourseFormValues,
  status: CreateCourseStatus,
): CreateCourseRequest {
  const nowMs = Date.now();
  return {
    name: values.name,
    summary: values.summary,
    description: toCourseDescription(values.description),
    contentUrl: values.contentUrl,
    status,
    schedule: toSchedule(values.schedule),
    prices: values.prices.map((price) =>
      toScheduledPrice(price, values.schedule.timeZone, nowMs),
    ),
  };
}

function toUtc(date: string, timeOfDay: string, timeZone: string): string {
  const result = wallClockToUtc(`${date}T${timeOfDay}`, timeZone);
  if (result.state === "failure") {
    throw new Error(
      `Cannot convert ${date} ${timeOfDay} in ${timeZone}: ${result.error}`,
    );
  }
  return result.data;
}

function toSchedule(schedule: Schedule): CreateCourseRequest["schedule"] {
  const { timeZone } = schedule;
  return {
    startTime: toUtc(schedule.startDate, schedule.startTimeOfDay, timeZone),
    endTime: toUtc(schedule.endDate, schedule.endTimeOfDay, timeZone),
    timeZone,
  };
}

/** Safe because the schema allows at most two decimals: rounding only absorbs float noise. */
function toCents(dollars: string): number {
  return Math.round(Number(normalizeDollars(dollars)) * 100);
}

function toScheduledPrice(
  price: Price,
  timeZone: string,
  nowMs: number,
): CreateCourseRequest["prices"][number] {
  // Both empty means "when saved": a minute ahead, as the API refuses the past.
  const effectiveAt = price.effectiveDate
    ? toUtc(price.effectiveDate, price.effectiveTimeOfDay, timeZone)
    : new Date(nowMs + MIN_PRICE_LEAD_MS).toISOString();
  return {
    amount: toCents(price.amountDollars),
    currency: COURSE_CURRENCY,
    effectiveAt,
  };
}
