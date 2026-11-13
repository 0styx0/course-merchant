import type { Temporal } from "@js-temporal/polyfill";

/** "Monday, January 5, 2026 at 6:00 PM EST" in the course's own time zone. */
export function formatCourseTime(
  instant: Temporal.Instant,
  timeZone: string,
): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
    timeZoneName: "short",
  }).format(new Date(instant.epochMilliseconds));
}
