import type { CourseFormValues } from "./course-form-schema";
import {
  issueAt,
  toUtcMsOrIssue,
  type Conversion,
  type FormIssue,
} from "./form-issue-and-time-conversion";
import { priceRowIssues } from "./price-row-issues";

type Schedule = CourseFormValues["schedule"];

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
    ...priceRowIssues(values.prices, {
      timeZone: values.schedule.timeZone,
      nowMs,
      loadedFuturePrices: [],
      emptyStartWords: "when the course is saved",
    }),
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

export function conversionIssues(
  start: Conversion,
  end: Conversion,
): FormIssue[] {
  return [
    ...conversionIssue(start, ["schedule", "startTimeOfDay"]),
    ...conversionIssue(end, ["schedule", "endTimeOfDay"]),
  ];
}

function conversionIssue(conversion: Conversion, path: FormIssue["path"]) {
  if (conversion.kind !== "issue") return [];
  return [issueAt(path, conversion.message)];
}

export function startInPastIssues(
  start: Conversion,
  nowMs: number,
): FormIssue[] {
  if (start.kind !== "ms" || start.ms > nowMs) return [];
  return [
    issueAt(
      ["schedule", "startTimeOfDay"],
      "The start time must be in the future.",
    ),
  ];
}

export function endNotAfterStartIssues(
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
