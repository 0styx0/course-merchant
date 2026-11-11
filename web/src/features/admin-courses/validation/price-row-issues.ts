import { utcToWallClock, wallClockToUtc } from "@/lib/time/wall-clock-time";

import { toCents } from "../price/dollar-amount";
import { MIN_PRICE_LEAD_MS } from "./course-form-limits";
import {
  issueAt,
  toUtcMsOrIssue,
  type Conversion,
  type FormIssue,
} from "./form-issue-and-time-conversion";

/** One price row's boxes as typed; both date and time empty means "when saved". */
type PriceRowBoxes = {
  amountDollars: string;
  effectiveDate: string;
  effectiveTimeOfDay: string;
};

/** A price row's start boxes as typed. */
type PriceStartBoxes = Pick<
  PriceRowBoxes,
  "effectiveDate" | "effectiveTimeOfDay"
>;

/** What is wrong with a price row's start boxes, before any comparison with other times. */
export type PriceStartProblem =
  | "needs-time"
  | "needs-date"
  | "invalid-time"
  | "skipped-time"
  | "unknown-zone";

type HalfFilledStart = Extract<PriceStartProblem, "needs-time" | "needs-date">;

/** Which of a row's date and time boxes is missing while the other has text. */
function halfFilledStart({
  effectiveDate: date,
  effectiveTimeOfDay: timeOfDay,
}: PriceStartBoxes): HalfFilledStart | undefined {
  if (date && !timeOfDay) return "needs-time";
  if (timeOfDay && !date) return "needs-date";
  return undefined;
}

/**
 * The one check of a row's start boxes that both the box messages and the
 * price list read. The box messages skip "unknown-zone", because the zone box
 * carries that message.
 */
export function priceStartProblem(
  boxes: PriceStartBoxes,
  timeZone: string,
): PriceStartProblem | undefined {
  const { effectiveDate: date, effectiveTimeOfDay: timeOfDay } = boxes;
  const halfFilled = halfFilledStart(boxes);
  if (halfFilled) return halfFilled;
  if (!date) return undefined;
  const result = wallClockToUtc(`${date}T${timeOfDay}`, timeZone);
  if (result.state === "success") return undefined;
  if (result.error === "daylight-saving") return "skipped-time";
  return result.error;
}

/** A price the edit page loaded that started after the page rendered. */
export type LoadedFuturePrice = { amount: number; effectiveAt: string };

type PriceRowCheckOptions = {
  timeZone: string;
  nowMs: number;
  /** A row that still holds one of these may start in the past. Create has none. */
  loadedFuturePrices: LoadedFuturePrice[];
  /** What an empty start means to the admin, e.g. "when the course is published". */
  emptyStartWords: string;
};

/** One price row: its own problems, and its time when that time is known. */
type CheckedPriceRow = { issues: FormIssue[]; ms?: number };

const MINUTE_MS = 60_000;

/** The boxes show minutes only, so the loaded time is compared without its seconds. */
const dropSeconds = (ms: number) => Math.floor(ms / MINUTE_MS) * MINUTE_MS;

/**
 * The loaded future price a row still holds: the same amount, and the same time
 * once the loaded one drops its seconds. Undefined for a changed or new row.
 */
export function findLoadedFuturePrice<Loaded extends LoadedFuturePrice>(
  amountDollars: string,
  rowTimeMs: number,
  loadedFuturePrices: Loaded[],
): Loaded | undefined {
  return loadedFuturePrices.find(
    (loaded) =>
      loaded.amount === toCents(amountDollars) &&
      dropSeconds(Date.parse(loaded.effectiveAt)) === rowTimeMs,
  );
}

/**
 * Checks the price rows: each row's own problems first, then whether two rows
 * start at the same moment. A changed row must start at least a minute ahead;
 * a row still holding a loaded future price may start in the past.
 */
export function priceRowIssues(
  rows: PriceRowBoxes[],
  options: PriceRowCheckOptions,
): FormIssue[] {
  const checkedRows = rows.map((row, index) =>
    checkPriceRow(row, index, options),
  );
  return checkedRows.flatMap((row, index) =>
    row.issues.length > 0
      ? row.issues
      : duplicateTimeIssues(row, index, checkedRows.slice(0, index)),
  );
}

function checkPriceRow(
  row: PriceRowBoxes,
  index: number,
  options: PriceRowCheckOptions,
): CheckedPriceRow {
  const halfFilled = halfFilledIssue(row, index);
  if (halfFilled) return { issues: [halfFilled] };

  // Both empty means "when saved", which the request builder sets to now + 1 minute.
  const { effectiveDate: date, effectiveTimeOfDay: timeOfDay } = row;
  if (!date) return { issues: [], ms: options.nowMs + MIN_PRICE_LEAD_MS };

  const time = toUtcMsOrIssue({ date, timeOfDay }, options.timeZone);
  return checkStartTime(row, index, time, options);
}

function checkStartTime(
  row: PriceRowBoxes,
  index: number,
  time: Conversion,
  options: PriceRowCheckOptions,
): CheckedPriceRow {
  const path = ["prices", index, "effectiveTimeOfDay"];
  if (time.kind === "issue") {
    return { issues: [issueAt(path, time.message)] };
  }
  // An unknown zone has its own message on the zone box; this row waits for it.
  if (time.kind === "skip") return { issues: [] };
  const { nowMs, loadedFuturePrices } = options;
  if (findLoadedFuturePrice(row.amountDollars, time.ms, loadedFuturePrices)) {
    return { issues: [], ms: time.ms };
  }
  if (time.ms >= nowMs + MIN_PRICE_LEAD_MS) return { issues: [], ms: time.ms };
  return { issues: [tooSoonIssue(row, index, options)], ms: time.ms };
}

function halfFilledIssue(
  row: PriceRowBoxes,
  index: number,
): FormIssue | undefined {
  const problem = halfFilledStart(row);
  if (problem === "needs-time") {
    return issueAt(
      ["prices", index, "effectiveTimeOfDay"],
      "Enter a time, or clear the date.",
    );
  }
  if (problem === "needs-date") {
    return issueAt(
      ["prices", index, "effectiveDate"],
      "Enter a date, or clear the time.",
    );
  }
  return undefined;
}

/** Today's date in the zone, or nothing when the zone is not valid. */
function todayInZone(nowMs: number, timeZone: string) {
  return utcToWallClock(new Date(nowMs).toISOString(), timeZone)?.date;
}

/**
 * A passed day belongs on the date box; a time that is too soon today belongs
 * on the time box. Today comes from the clock alone, so the minute of lead time
 * never turns the last minute of today into a passed day. ISO dates compare as text.
 */
function tooSoonIssue(
  row: PriceRowBoxes,
  index: number,
  { nowMs, timeZone, emptyStartWords }: PriceRowCheckOptions,
): FormIssue {
  const today = todayInZone(nowMs, timeZone);
  if (today !== undefined && row.effectiveDate < today) {
    return issueAt(
      ["prices", index, "effectiveDate"],
      `Choose a date that isn't in the past, or leave both empty to start ${emptyStartWords}.`,
    );
  }
  return issueAt(
    ["prices", index, "effectiveTimeOfDay"],
    `Choose a time at least a minute from now, or leave both empty to start ${emptyStartWords}.`,
  );
}

function duplicateTimeIssues(
  row: CheckedPriceRow,
  index: number,
  earlierRows: CheckedPriceRow[],
): FormIssue[] {
  if (row.ms === undefined) return [];
  if (!earlierRows.some((earlier) => earlier.ms === row.ms)) return [];
  return [
    issueAt(
      ["prices", index, "effectiveTimeOfDay"],
      "Two prices can't take effect at the same time.",
    ),
  ];
}
