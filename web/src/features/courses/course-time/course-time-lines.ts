import type { Course } from "@/lib/types";
import { formatCourseLength } from "@/lib/time/format-course-length";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

type CourseTimeLines = {
  /** One time range, or the date range of a course lasting 24 hours or more. */
  timeOrDateRangeLine: string;
  /** The first start and last end with weekdays; only a course lasting 24 hours or more has one. */
  firstStartToLastEndLine: string | undefined;
  /** "2 hours", "1 hour 30 minutes" or "2 days 2 hours". */
  lengthLine: string;
};

type Schedule = Course["schedule"];

function makeZonedFormatter(
  schedule: Schedule,
  locale: string,
  options: Intl.DateTimeFormatOptions,
) {
  return new Intl.DateTimeFormat(locale, {
    timeZone: schedule.timeZone,
    ...options,
  });
}

function formatStartToEnd(
  schedule: Schedule,
  formatter: Intl.DateTimeFormat,
): string {
  return formatter.formatRange(
    new Date(schedule.startTime),
    new Date(schedule.endTime),
  );
}

function formatWeekdayDateTimeRange(
  schedule: Schedule,
  locale: string,
): string {
  const formatter = makeZonedFormatter(schedule, locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
  return formatStartToEnd(schedule, formatter);
}

function formatDateRange(schedule: Schedule, locale: string): string {
  const formatter = makeZonedFormatter(schedule, locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return formatStartToEnd(schedule, formatter);
}

function getDurationMs(schedule: Schedule): number {
  return Date.parse(schedule.endTime) - Date.parse(schedule.startTime);
}

/**
 * The text the buy panel shows for when a course runs, in the course's own
 * time zone and the visitor's locale, and for how long it lasts.
 */
export function makeCourseTimeLines(
  schedule: Schedule,
  locale: string,
): CourseTimeLines {
  const durationMs = getDurationMs(schedule);
  const lengthLine = formatCourseLength(durationMs);

  if (durationMs < MS_PER_DAY) {
    return {
      timeOrDateRangeLine: formatWeekdayDateTimeRange(schedule, locale),
      firstStartToLastEndLine: undefined,
      lengthLine,
    };
  }
  return {
    timeOrDateRangeLine: formatDateRange(schedule, locale),
    firstStartToLastEndLine: formatWeekdayDateTimeRange(schedule, locale),
    lengthLine,
  };
}
