import type { CourseFormValues } from "./course-form-schema";
import { wallClockToUtc } from "./wall-clock-time";

const MS_PER_MINUTE = 60_000;
const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;

function plural(count: number, unit: string): string {
  return `${count} ${unit}${count === 1 ? "" : "s"}`;
}

/** "2 hours 30 minutes": whole minutes, in days, hours and minutes (no zero parts). */
export function formatCourseLength(durationMs: number): string {
  const totalMinutes = Math.floor(durationMs / MS_PER_MINUTE);
  const parts = [
    [Math.floor(totalMinutes / MINUTES_PER_DAY), "day"],
    [Math.floor((totalMinutes % MINUTES_PER_DAY) / MINUTES_PER_HOUR), "hour"],
    [totalMinutes % MINUTES_PER_HOUR, "minute"],
  ] as const;

  const shown = parts
    .filter(([count]) => count > 0)
    .map(([count, unit]) => plural(count, unit));
  return shown.length > 0 ? shown.join(" ") : plural(0, "minute");
}

function toUtcMs(date: string, timeOfDay: string, timeZone: string) {
  const result = wallClockToUtc(`${date}T${timeOfDay}`, timeZone);
  return result.state === "success" ? Date.parse(result.data) : undefined;
}

/**
 * "2 hours 30 minutes" for the typed start and end, or nothing until both are
 * complete, convertible and in order. The form's own checks report the rest.
 */
export function scheduleLength(
  schedule: CourseFormValues["schedule"],
): string | undefined {
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
  return formatCourseLength(endMs - startMs);
}
