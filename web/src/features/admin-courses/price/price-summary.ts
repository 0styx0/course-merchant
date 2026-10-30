import {
  amountProblem,
  normalizeDollars,
  type CourseFormValues,
} from "../validation/course-form-schema";
import { formatMoment } from "../schedule/summary/format-moment";
import { toUtcMs } from "../schedule/wall-clock-time";

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

const textPart = (text: string): PricePart => ({ text, isError: false });
const errorPart: PricePart = { text: "Error", isError: true };

/** "$79.50", "$99" or "Free", or "$Error" for an amount that isn't a valid price. */
function amountParts(typed: string): PricePart[] {
  if (amountProblem(typed) !== undefined) return [textPart("$"), errorPart];
  return [textPart(formatDollars(typed))];
}

function startPart(startMs: number | undefined, timeZone: string): PricePart {
  if (startMs === undefined) return errorPart;
  if (startMs === -Infinity) return textPart(WHEN_PUBLISHED);
  return textPart(formatMoment(startMs, timeZone));
}

/** The start, or nothing if an earlier row already starts then. */
function unclaimedStart(
  startMs: number | undefined,
  usedStarts: Set<number>,
): number | undefined {
  if (startMs === undefined || usedStarts.has(startMs)) return undefined;
  usedStarts.add(startMs);
  return startMs;
}

/** A price's pieces, and where it sorts: by start, with broken starts last. */
function priceLine(
  price: CourseFormValues["prices"][number],
  timeZone: string,
  usedStarts: Set<number>,
) {
  const startMs = priceStartMs(price, timeZone);
  if (price.amountDollars.trim() === "") {
    return { parts: [], sortKey: startMs ?? Infinity };
  }
  const claimed = unclaimedStart(startMs, usedStarts);
  return {
    parts: [
      ...amountParts(price.amountDollars),
      textPart(" from "),
      startPart(claimed, timeZone),
    ],
    sortKey: claimed ?? Infinity,
  };
}

function hasPriceInput(prices: CourseFormValues["prices"]): boolean {
  return prices.some(({ amountDollars, effectiveDate, effectiveTimeOfDay }) =>
    [amountDollars, effectiveDate, effectiveTimeOfDay].some(
      (typed) => typed.trim() !== "",
    ),
  );
}

/**
 * Nothing while every price input is empty; otherwise one line per price, as
 * pieces: valid starts in start order, then the prices whose start is
 * incomplete, unconvertible or the same as an earlier row's. Only the broken piece reads "Error" ("$79 from Error", "$Error from Feb 1,
 * 2027, 9:00 AM"). A price with no amount typed is an empty line. The form's
 * own checks say what is wrong.
 */
export function priceSummary(
  prices: CourseFormValues["prices"],
  timeZone: string,
): { timeZone: string; lines: PricePart[][] } | undefined {
  if (!hasPriceInput(prices)) return undefined;
  const usedStarts = new Set<number>();
  // Rows are read in the order shown, so the later of two equal starts is the repeat.
  const lines = prices.map((price) => priceLine(price, timeZone, usedStarts));
  // Two equal infinities subtract to NaN, which sort treats as "keep the order".
  lines.sort((a, b) => a.sortKey - b.sortKey);
  return { timeZone, lines: lines.map(({ parts }) => parts) };
}
