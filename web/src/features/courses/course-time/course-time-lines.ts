import type { Course } from "@/lib/types";
import { formatCourseLength } from "@/lib/time/format-course-length";
import { dateOnlyFormatter } from "@/lib/utils/formatters";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const LONG_COURSE_MS = 28 * MS_PER_DAY;

type CourseTimeLines = {
  /** One time range, or the date range of a course lasting 24 hours or more. */
  timeOrDateRangeLine: string;
  /** The first start and last end with weekdays; only a course lasting 24 hours to under 28 days has one. */
  firstStartToLastEndLine: string | undefined;
  /** "2 hours", "1 hour 30 minutes" or "2 days 2 hours"; a course lasting 28 days or more has none. */
  lengthLine: string | undefined;
  /** The start date, or the date range of a course lasting 28 days or more; the ended panel shows it. */
  endedDateLine: string;
  /** False for a course lasting 28 days or more, whose date range is all the panel shows. */
  shouldShowVisitorTimeLine: boolean;
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

/** The date the course starts, in its own time zone and the visitor's locale. */
export function formatStartDate(schedule: Schedule, locale: string): string {
  return dateOnlyFormatter(schedule.timeZone, locale).format(
    new Date(schedule.startTime),
  );
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

  const endedDateLine = formatStartDate(schedule, locale);

  if (durationMs >= LONG_COURSE_MS) {
    const dateRangeLine = formatDateRange(schedule, locale);
    return {
      timeOrDateRangeLine: dateRangeLine,
      firstStartToLastEndLine: undefined,
      lengthLine: undefined,
      endedDateLine: dateRangeLine,
      shouldShowVisitorTimeLine: false,
    };
  }
  if (durationMs < MS_PER_DAY) {
    return {
      timeOrDateRangeLine: formatWeekdayDateTimeRange(schedule, locale),
      firstStartToLastEndLine: undefined,
      lengthLine,
      endedDateLine,
      shouldShowVisitorTimeLine: true,
    };
  }
  return {
    timeOrDateRangeLine: formatDateRange(schedule, locale),
    firstStartToLastEndLine: formatWeekdayDateTimeRange(schedule, locale),
    lengthLine,
    endedDateLine,
    shouldShowVisitorTimeLine: true,
  };
}
