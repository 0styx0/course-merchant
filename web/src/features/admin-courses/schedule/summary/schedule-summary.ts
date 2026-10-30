import type { CourseFormValues } from "../../validation/course-form-schema";
import { formatCourseLength } from "./format-course-length";
import { formatMoment } from "./format-moment";
import { toUtcMs } from "../wall-clock-time";

/** The start and end as UTC times, or nothing until both are complete, convertible and in order. */
function scheduleBounds(schedule: CourseFormValues["schedule"]) {
  const { startDate, startTimeOfDay, endDate, endTimeOfDay, timeZone } =
    schedule;
  if (!startDate || !startTimeOfDay || !endDate || !endTimeOfDay) {
    return undefined;
  }
  const startMs = toUtcMs(startDate, startTimeOfDay, timeZone);
  const endMs = toUtcMs(endDate, endTimeOfDay, timeZone);
  if (startMs === undefined || endMs === undefined || endMs <= startMs) {
    return undefined;
  }
  return { startMs, endMs };
}

/**
 * "Runs Jan 3, 2027, 9:00 AM to Jan 3, 2027, 11:30 AM (America/New_York).
 * Lasts 2 hours 30 minutes.", or nothing until both ends are complete,
 * convertible and in order. The form's own checks report the rest.
 */
export function scheduleSummary(
  schedule: CourseFormValues["schedule"],
): string | undefined {
  const bounds = scheduleBounds(schedule);
  if (!bounds) return undefined;
  const { startMs, endMs } = bounds;
  const { timeZone } = schedule;
  return `Runs ${formatMoment(startMs, timeZone)} to ${formatMoment(endMs, timeZone)} (${timeZone}). Lasts ${formatCourseLength(endMs - startMs)}.`;
}
