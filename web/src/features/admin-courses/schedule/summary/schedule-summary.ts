import type { CourseFormValues } from "../../validation/course-form-schema";
import { formatCourseLength } from "./format-course-length";
import { formatMoment } from "./format-moment";
import { toUtcMs } from "../wall-clock-time";

type Schedule = CourseFormValues["schedule"];

/** True when the admin has filled both dates and both times. */
function hasEveryScheduleBox(
  schedule: Schedule,
): schedule is Schedule & Record<keyof Schedule, string> {
  const { startDate, startTimeOfDay, endDate, endTimeOfDay } = schedule;
  return Boolean(startDate && startTimeOfDay && endDate && endTimeOfDay);
}

/** The start and end as UTC times, or nothing until both are complete, convertible and in order. */
function scheduleBounds(schedule: Schedule) {
  if (!hasEveryScheduleBox(schedule)) return undefined;
  const { startDate, startTimeOfDay, endDate, endTimeOfDay, timeZone } =
    schedule;
  const startMs = toUtcMs(startDate, startTimeOfDay, timeZone);
  const endMs = toUtcMs(endDate, endTimeOfDay, timeZone);
  if (startMs === undefined || endMs === undefined || endMs <= startMs) {
    return undefined;
  }
  return { startMs, endMs };
}

/** "Runs Jan 3, 2027, 9:00 AM to Jan 3, 2027, 11:30 AM (America/New_York). Lasts 2 hours 30 minutes." */
export function scheduleSentence(
  startMs: number,
  endMs: number,
  timeZone: string,
): string {
  return `Runs ${formatMoment(startMs, timeZone)} to ${formatMoment(endMs, timeZone)} (${timeZone}). Lasts ${formatCourseLength(endMs - startMs)}.`;
}

/**
 * The sentence from `scheduleSentence`, or nothing until both ends are
 * complete, convertible and in order. The form's own checks report the rest.
 */
export function scheduleSummary(
  schedule: CourseFormValues["schedule"],
): string | undefined {
  const bounds = scheduleBounds(schedule);
  if (!bounds) return undefined;
  return scheduleSentence(bounds.startMs, bounds.endMs, schedule.timeZone);
}
