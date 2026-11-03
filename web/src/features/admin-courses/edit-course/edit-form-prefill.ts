import { toDollarText } from "../price/dollar-amount";
import { utcToWallClock } from "../schedule/wall-clock-time";
import type { AdminCourse } from "@/lib/types";

import type {
  EditCourseFormValues,
  LoadedPrice,
  LoadedPrices,
  LoadedSchedule,
} from "../validation/edit-course-form-schema";

export type ScheduleProgress = "notStarted" | "running" | "ended";

export type EditFormPrefill = {
  values: EditCourseFormValues;
  loadedSchedule: LoadedSchedule;
  loadedPrices: LoadedPrices;
  /** Whether the stored schedule had started or ended when the page rendered. */
  scheduleProgress: ScheduleProgress;
  /** The stored image's version, or null when the course has no image yet. */
  storedImageVersion: string | null;
  /**
   * Whether the course has any enrollment, refunded or suspended ones too (the
   * API's delete rule counts them all); the enrollments stay on the server.
   */
  hasEnrollments: boolean;
};

type PriceRowValues = EditCourseFormValues["prices"][number];

// A stored zone the list lacks shows its times in UTC; the zone field reports the zone.
function storedTimeBoxes(utc: string, timeZone: string) {
  const wallClock = utcToWallClock(utc, timeZone) ?? utcToWallClock(utc, "UTC");
  return { date: wallClock?.date ?? "", timeOfDay: wallClock?.timeOfDay ?? "" };
}

/**
 * Splits once, when the page renders, so the server and the browser agree on
 * which prices are rows. The API keeps a price that matches a stored one
 * exactly, so the prices carry no ids.
 */
function splitLoadedPrices(
  prices: AdminCourse["prices"],
  renderMs: number,
): LoadedPrices {
  const withoutIds = prices.map(({ amount, currency, effectiveAt }) => ({
    amount,
    currency,
    effectiveAt,
  }));
  const hasStarted = (price: LoadedPrice) =>
    Date.parse(price.effectiveAt) <= renderMs;
  return {
    inEffect: withoutIds.filter(hasStarted),
    future: withoutIds.filter((price) => !hasStarted(price)),
  };
}

function scheduleProgressAt(
  { startTime, endTime }: LoadedSchedule,
  renderMs: number,
): ScheduleProgress {
  if (Date.parse(startTime) > renderMs) return "notStarted";
  if (Date.parse(endTime) <= renderMs) return "ended";
  return "running";
}

function toPriceRowValues(
  price: LoadedPrice,
  timeZone: string,
): PriceRowValues {
  const start = storedTimeBoxes(price.effectiveAt, timeZone);
  return {
    amountDollars: toDollarText(price.amount),
    effectiveDate: start.date,
    effectiveTimeOfDay: start.timeOfDay,
  };
}

/**
 * Picks only what the browser needs from the loaded course: its
 * `enrollments` hold customers' emails and payment details.
 */
export function toEditFormPrefill(
  course: AdminCourse,
  renderMs = Date.now(),
): EditFormPrefill {
  const { startTime, endTime, timeZone } = course.schedule;
  const start = storedTimeBoxes(startTime, timeZone);
  const end = storedTimeBoxes(endTime, timeZone);
  const loadedPrices = splitLoadedPrices(course.prices, renderMs);
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
      prices: loadedPrices.future.map((price) =>
        toPriceRowValues(price, timeZone),
      ),
      status: course.status.name,
      image: null,
    },
    loadedSchedule: { startTime, endTime },
    loadedPrices,
    scheduleProgress: scheduleProgressAt({ startTime, endTime }, renderMs),
    storedImageVersion: course.image?.version ?? null,
    hasEnrollments: course.enrollments.length > 0,
  };
}
