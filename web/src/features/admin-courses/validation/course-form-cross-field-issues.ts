import { MIN_PRICE_LEAD_MS } from "./course-form-limits";
import type { CourseFormValues } from "./course-form-schema";
import { wallClockToUtc } from "../schedule/wall-clock-time";

type FormIssue = { path: (string | number)[]; message: string };

const issueAt = (path: (string | number)[], message: string): FormIssue => ({
  path,
  message,
});

type Conversion =
  | { kind: "ms"; ms: number }
  | { kind: "issue"; message: string }
  | { kind: "skip" };

/** The date and time of day the admin typed, in the chosen zone. */
type DateAndTime = { date: string; timeOfDay: string };

type Schedule = CourseFormValues["schedule"];
type Price = CourseFormValues["prices"][number];

/** Date and time of day to UTC milliseconds, or the message to show instead. */
function toUtcMsOrIssue(
  { date, timeOfDay }: DateAndTime,
  timeZone: string,
): Conversion {
  if (!date || !timeOfDay) return { kind: "skip" };
  const result = wallClockToUtc(`${date}T${timeOfDay}`, timeZone);
  if (result.state === "success") {
    return { kind: "ms", ms: Date.parse(result.data) };
  }
  switch (result.error) {
    case "daylight-saving":
      return {
        kind: "issue",
        message: `That time doesn't exist, or happens twice, on that day in ${timeZone} because of a daylight-saving change. Choose another time.`,
      };
    case "invalid-time":
      return { kind: "issue", message: "Enter a valid date and time." };
    case "unknown-zone":
      return { kind: "skip" };
  }
}

/**
 * Checks that compare fields. They run even while other fields are empty or
 * wrong (the zone is then unknown and the time is skipped, since that field
 * reports its own problem), so the admin sees every problem at once.
 */
export function crossFieldIssues(
  values: CourseFormValues,
  nowMs: number,
): FormIssue[] {
  return [
    ...scheduleIssues(values.schedule, nowMs),
    ...priceTimeIssues(values.prices, values.schedule.timeZone, nowMs),
  ];
}

// Problems with a combined date and time are shown on the time-of-day field.
function scheduleIssues(schedule: Schedule, nowMs: number): FormIssue[] {
  const start = toUtcMsOrIssue(
    { date: schedule.startDate, timeOfDay: schedule.startTimeOfDay },
    schedule.timeZone,
  );
  const end = toUtcMsOrIssue(
    { date: schedule.endDate, timeOfDay: schedule.endTimeOfDay },
    schedule.timeZone,
  );
  return [
    ...conversionIssues(start, end),
    ...startInPastIssues(start, nowMs),
    ...endNotAfterStartIssues(start, end),
  ];
}

function conversionIssues(start: Conversion, end: Conversion): FormIssue[] {
  return [
    ...conversionIssue(start, ["schedule", "startTimeOfDay"]),
    ...conversionIssue(end, ["schedule", "endTimeOfDay"]),
  ];
}

function conversionIssue(conversion: Conversion, path: FormIssue["path"]) {
  if (conversion.kind !== "issue") return [];
  return [issueAt(path, conversion.message)];
}

function startInPastIssues(start: Conversion, nowMs: number): FormIssue[] {
  if (start.kind !== "ms" || start.ms > nowMs) return [];
  return [
    issueAt(
      ["schedule", "startTimeOfDay"],
      "The start time must be in the future.",
    ),
  ];
}

function endNotAfterStartIssues(
  start: Conversion,
  end: Conversion,
): FormIssue[] {
  if (start.kind !== "ms" || end.kind !== "ms" || end.ms > start.ms) return [];
  return [
    issueAt(
      ["schedule", "endTimeOfDay"],
      "The end time must be after the start time.",
    ),
  ];
}

/** One price row: its own problems, and its time when that time is known. */
type PriceRow = { issues: FormIssue[]; ms?: number };

function priceTimeIssues(
  prices: Price[],
  timeZone: string,
  nowMs: number,
): FormIssue[] {
  const rows = prices.map((price, index) =>
    checkPriceRow(price, index, timeZone, nowMs),
  );
  return rows.flatMap((row, index) =>
    row.issues.length > 0
      ? row.issues
      : duplicateTimeIssues(row, index, rows.slice(0, index)),
  );
}

function checkPriceRow(
  price: Price,
  index: number,
  timeZone: string,
  nowMs: number,
): PriceRow {
  const halfFilled = halfFilledIssue(price, index);
  if (halfFilled) return { issues: [halfFilled] };

  // Both empty means "when saved", which the request builder sets to now + 1 minute.
  const { effectiveDate: date, effectiveTimeOfDay: timeOfDay } = price;
  if (!date) return { issues: [], ms: nowMs + MIN_PRICE_LEAD_MS };

  const time = toUtcMsOrIssue({ date, timeOfDay }, timeZone);
  const path = ["prices", index, "effectiveTimeOfDay"];
  if (time.kind === "issue") {
    return { issues: [issueAt(path, time.message)] };
  }
  if (time.kind === "skip") return { issues: [] };
  return { issues: tooSoonIssues(time.ms, path, nowMs), ms: time.ms };
}

function halfFilledIssue(price: Price, index: number): FormIssue | undefined {
  const { effectiveDate: date, effectiveTimeOfDay: timeOfDay } = price;
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
  nowMs: number,
): FormIssue[] {
  if (ms >= nowMs + MIN_PRICE_LEAD_MS) return [];
  return [
    issueAt(
      path,
      "Choose a time at least a minute from now, or leave both empty to start when the course is saved.",
    ),
  ];
}

function duplicateTimeIssues(
  row: PriceRow,
  index: number,
  earlierRows: PriceRow[],
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
