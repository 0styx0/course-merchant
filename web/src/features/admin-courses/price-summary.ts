import {
  amountProblem,
  normalizeDollars,
  type CourseFormValues,
} from "./course-form-schema";
import { formatMoment } from "./format-moment";
import { toUtcMs } from "./wall-clock-time";

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
