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

/** Formats an amount in the currency's smallest unit, e.g. 1999 → "$19.99". */
export function formatMoney(amount: number, currency: string): string {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  });
  const { maximumFractionDigits } = formatter.resolvedOptions();

  return formatter.format(amount / 10 ** (maximumFractionDigits ?? 2));
}
