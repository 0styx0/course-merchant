import {
  amountProblem,
  type CourseFormValues,
} from "../validation/course-form-schema";
import {
  priceStartProblem,
  type PriceStartProblem,
} from "../validation/price-row-issues";
import { normalizeDollars } from "./dollar-amount";
import { formatMoment } from "../schedule/summary/format-moment";
import { toUtcMs } from "../schedule/wall-clock-time";

/** "$79.50", "$99.00" or "Free": the typed amount, with a comma read as the decimal mark. */
export function formatDollars(typed: string): string {
  const dollars = normalizeDollars(typed);
  if (Number(dollars) === 0) return "Free";
  const [whole, cents = ""] = dollars.split(".");
  return `$${Number(whole)}.${cents.padEnd(2, "0")}`;
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

/** A piece of a price line; an error piece names what to fix and is shown in red. */
export type PricePart = { text: string; isError: boolean };

const textPart = (text: string): PricePart => ({ text, isError: false });
const errorPart = (words: string): PricePart => ({
  text: `(${words})`,
  isError: true,
});

/** "$79.50", "$99.00" or "Free", or "(price needs fixing)" for an amount that isn't a valid price. */
function amountPart(typed: string): PricePart {
  if (amountProblem(typed) !== undefined) {
    return errorPart("price needs fixing");
  }
  return textPart(formatDollars(typed));
}

const START_PROBLEM_WORDS: Record<PriceStartProblem, string> = {
  "needs-time": "needs a time",
  "needs-date": "needs a date",
  "invalid-time": "date or time isn't valid",
  "skipped-time": "time doesn't exist in this zone",
  "unknown-zone": "needs a valid zone",
};

/** What the page shows for a price start: its words for an empty start, a moment, or what to fix. */
type StartTextOptions = { timeZone: string; textForEmptyStart: string };

function startPart(
  price: CourseFormValues["prices"][number],
  claimedMs: number | undefined,
  { timeZone, textForEmptyStart }: StartTextOptions,
): PricePart {
  const problem = priceStartProblem(price, timeZone);
  if (problem) return errorPart(START_PROBLEM_WORDS[problem]);
  if (claimedMs === undefined) return errorPart("same start as another price");
  if (claimedMs === -Infinity) return textPart(textForEmptyStart);
  return textPart(formatMoment(claimedMs, timeZone));
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
  startText: StartTextOptions,
  usedStarts: Set<number>,
) {
  const startMs = priceStartMs(price, startText.timeZone);
  if (price.amountDollars.trim() === "") {
    return { parts: [], sortKey: startMs ?? Infinity };
  }
  const claimed = unclaimedStart(startMs, usedStarts);
  return {
    parts: [
      amountPart(price.amountDollars),
      textPart(" from "),
      startPart(price, claimed, startText),
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
 * incomplete, unconvertible or the same as an earlier row's. Only the broken piece reads as words in
 * parentheses ("$79.00 from (needs a time)", "(price needs fixing) from Feb 1,
 * 2027, 9:00 AM"). A price with no amount typed is an empty line. The form's
 * own checks say what is wrong. An empty start reads `textForEmptyStart`,
 * because create and edit start such a price at different moments.
 */
export function priceSummary(
  prices: CourseFormValues["prices"],
  startText: StartTextOptions,
): { timeZone: string; lines: PricePart[][] } | undefined {
  if (!hasPriceInput(prices)) return undefined;
  const usedStarts = new Set<number>();
  // Rows are read in the order shown, so the later of two equal starts is the repeat.
  const lines = prices.map((price) => priceLine(price, startText, usedStarts));
  // Two equal infinities subtract to NaN, which sort treats as "keep the order".
  lines.sort((a, b) => a.sortKey - b.sortKey);
  return {
    timeZone: startText.timeZone,
    lines: lines.map(({ parts }) => parts),
  };
}
