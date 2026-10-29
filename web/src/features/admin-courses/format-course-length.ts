import {
  amountProblem,
  normalizeDollars,
  type CourseFormValues,
} from "./course-form-schema";
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

/** "Jan 3, 2027, 9:00 AM": a moment as wall-clock time in the zone, in US style. */
export function formatMoment(ms: number, timeZone: string): string {
  return (
    new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone,
    })
      .format(ms)
      // Newer ICU puts a narrow no-break space before AM/PM.
      .replace(/\u202f/g, " ")
  );
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

/** "$79.50", "$99" or "Free": the typed amount, with a comma read as the decimal mark. */
function formatDollars(typed: string): string {
  const dollars = normalizeDollars(typed);
  if (Number(dollars) === 0) return "Free";
  const [whole, cents = ""] = dollars.split(".");
  const fraction = cents && `.${cents.padEnd(2, "0")}`;
  return `$${Number(whole)}${fraction}`;
}

/** When a price starts: -Infinity for "when published", nothing if the row is incomplete or unconvertible. */
function priceStartMs(
  price: CourseFormValues["prices"][number],
  timeZone: string,
): number | undefined {
  const { effectiveDate: date, effectiveTimeOfDay: timeOfDay } = price;
  if (!date && !timeOfDay) return -Infinity;
  if (!date || !timeOfDay) return undefined;
  return toUtcMs(date, timeOfDay, timeZone);
}

/** A piece of a price line; an error piece reads "Error" and is shown in red. */
export type PricePart = { text: string; isError: boolean };

const WHEN_PUBLISHED = "when the course is published";

const part = (text: string): PricePart => ({ text, isError: false });
const errorPart: PricePart = { text: "Error", isError: true };

/** "$79.50", "$99" or "Free", or "$Error" for an amount that isn't a valid price. */
function amountParts(typed: string): PricePart[] {
  if (amountProblem(typed) !== undefined) return [part("$"), errorPart];
  return [part(formatDollars(typed))];
}

function startPart(startMs: number | undefined, timeZone: string): PricePart {
  if (startMs === undefined) return errorPart;
  if (startMs === -Infinity) return part(WHEN_PUBLISHED);
  return part(formatMoment(startMs, timeZone));
}

/** The start, or nothing if an earlier row already starts then. */
function claimStart(
  startMs: number | undefined,
  taken: Set<number>,
): number | undefined {
  if (startMs === undefined || taken.has(startMs)) return undefined;
  taken.add(startMs);
  return startMs;
}

/** A price's pieces, and where it sorts: by start, with broken starts last. */
function priceLine(
  price: CourseFormValues["prices"][number],
  timeZone: string,
  taken: Set<number>,
) {
  const startMs = priceStartMs(price, timeZone);
  if (price.amountDollars.trim() === "") {
    return { parts: [], sortKey: startMs ?? Infinity };
  }
  const claimed = claimStart(startMs, taken);
  return {
    parts: [
      ...amountParts(price.amountDollars),
      part(" from "),
      startPart(claimed, timeZone),
    ],
    sortKey: claimed ?? Infinity,
  };
}

/**
 * One line per price, as pieces: valid starts in start order, then the prices
 * whose start is incomplete, unconvertible or the same as an earlier row's.
 * Only the broken piece reads "Error" ("$79 from Error", "$Error from Feb 1,
 * 2027, 9:00 AM"). A price with no amount typed is an empty line. The form's
 * own checks say what is wrong.
 */
export function priceSummary(
  prices: CourseFormValues["prices"],
  timeZone: string,
): { timeZone: string; lines: PricePart[][] } {
  const taken = new Set<number>();
  // Rows are read in the order shown, so the later of two equal starts is the repeat.
  const lines = prices.map((price) => priceLine(price, timeZone, taken));
  // Two equal infinities subtract to NaN, which sort treats as "keep the order".
  lines.sort((a, b) => a.sortKey - b.sortKey);
  return { timeZone, lines: lines.map(({ parts }) => parts) };
}
