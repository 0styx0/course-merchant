import { toCents } from "../price/dollar-amount";
import { MIN_PRICE_LEAD_MS } from "./course-form-limits";
import {
  issueAt,
  toUtcMsOrIssue,
  type FormIssue,
} from "./form-issue-and-time-conversion";

/** One price row's boxes as typed; both date and time empty means "when saved". */
type PriceRowBoxes = {
  amountDollars: string;
  effectiveDate: string;
  effectiveTimeOfDay: string;
};

/** A price the edit page loaded that started after the page rendered. */
export type LoadedFuturePrice = { amount: number; effectiveAt: string };

type PriceRowCheckOptions = {
  timeZone: string;
  nowMs: number;
  /** A row that still holds one of these may start in the past. Create has none. */
  loadedFuturePrices: LoadedFuturePrice[];
  /** What an empty start means to the admin, e.g. "when the course is saved". */
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
  const { nowMs, timeZone, loadedFuturePrices } = options;
  if (!date) return { issues: [], ms: nowMs + MIN_PRICE_LEAD_MS };

  const time = toUtcMsOrIssue({ date, timeOfDay }, timeZone);
  const path = ["prices", index, "effectiveTimeOfDay"];
  if (time.kind === "issue") {
    return { issues: [issueAt(path, time.message)] };
  }
  if (time.kind === "skip") return { issues: [] };
  if (findLoadedFuturePrice(row.amountDollars, time.ms, loadedFuturePrices)) {
    return { issues: [], ms: time.ms };
  }
  return { issues: tooSoonIssues(time.ms, path, options), ms: time.ms };
}

function halfFilledIssue(
  row: PriceRowBoxes,
  index: number,
): FormIssue | undefined {
  const { effectiveDate: date, effectiveTimeOfDay: timeOfDay } = row;
  if (date && !timeOfDay) {
    return issueAt(
      ["prices", index, "effectiveTimeOfDay"],
      "Enter a time, or clear the date.",
    );
  }
  if (timeOfDay && !date) {
    return issueAt(
      ["prices", index, "effectiveDate"],
      "Enter a date, or clear the time.",
    );
  }
  return undefined;
}

function tooSoonIssues(
  ms: number,
  path: FormIssue["path"],
  { nowMs, emptyStartWords }: PriceRowCheckOptions,
): FormIssue[] {
  if (ms >= nowMs + MIN_PRICE_LEAD_MS) return [];
  return [
    issueAt(
      path,
      `Choose a time at least a minute from now, or leave both empty to start ${emptyStartWords}.`,
    ),
  ];
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
