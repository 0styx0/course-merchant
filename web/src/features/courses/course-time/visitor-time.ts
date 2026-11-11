import { Temporal } from "temporal-polyfill";

import type { Course } from "@/lib/types";
import { utcToWallClock } from "@/lib/time/wall-clock-time";

type Schedule = Course["schedule"];

const TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short",
};

const DATE_AND_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  weekday: "short",
  month: "short",
  day: "numeric",
  ...TIME_OPTIONS,
};

function getOffsetNanosecondsAtStart(schedule: Schedule, timeZone: string) {
  return Temporal.Instant.from(schedule.startTime).toZonedDateTimeISO(timeZone)
    .offsetNanoseconds;
}

// Throws for a zone Temporal can't use; `makeVisitorTimeLine` turns that into no line.
function hasSameOffsetAtStart(schedule: Schedule, visitorTimeZone: string) {
  return (
    getOffsetNanosecondsAtStart(schedule, schedule.timeZone) ===
    getOffsetNanosecondsAtStart(schedule, visitorTimeZone)
  );
}

function getDateInZone(utc: string, timeZone: string) {
  return utcToWallClock(utc, timeZone)?.date;
}

// Without dates, a range across midnight would print numeric dates.
function visitorDatesDifferFromCourseStartDate(
  schedule: Schedule,
  visitorTimeZone: string,
) {
  const courseStartDate = getDateInZone(schedule.startTime, schedule.timeZone);
  return [schedule.startTime, schedule.endTime].some(
    (utc) => getDateInZone(utc, visitorTimeZone) !== courseStartDate,
  );
}

function formatVisitorRange(
  schedule: Schedule,
  locale: string,
  visitorTimeZone: string,
) {
  const options = visitorDatesDifferFromCourseStartDate(
    schedule,
    visitorTimeZone,
  )
    ? DATE_AND_TIME_OPTIONS
    : TIME_OPTIONS;
  return new Intl.DateTimeFormat(locale, {
    timeZone: visitorTimeZone,
    ...options,
  }).formatRange(new Date(schedule.startTime), new Date(schedule.endTime));
}

/**
 * "(3:00 – 5:00 PM PST your time)": the course's start and end in the
 * visitor's zone, with dates when the visitor's day differs from the course's.
 * Nothing when the visitor's UTC offset at the start matches the course's, or
 * when the visitor's zone is not usable.
 */
export function makeVisitorTimeLine(
  schedule: Schedule,
  locale: string,
  visitorTimeZone: string,
): string | undefined {
  try {
    if (hasSameOffsetAtStart(schedule, visitorTimeZone)) return undefined;
    return `(${formatVisitorRange(schedule, locale, visitorTimeZone)} your time)`;
  } catch {
    return undefined;
  }
}
