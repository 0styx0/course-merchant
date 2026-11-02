import {
  conversionIssues,
  endNotAfterStartIssues,
  startInPastIssues,
} from "./course-form-cross-field-issues";
import {
  issueAt,
  toUtcMsOrIssue,
  type Conversion,
  type FormIssue,
} from "./form-issue-and-time-conversion";
import type { LoadedSchedule } from "./edit-course-form-schema";

/** The four boxes the admin edits, and the zone they are read in. */
export type EditScheduleBoxes = {
  startDate: string;
  startTimeOfDay: string;
  endDate: string;
  endTimeOfDay: string;
  timeZone: string;
};

/** A time that converts to the stored moment is unchanged, so it is not checked. */
function onlyWhenChanged(
  conversion: Conversion,
  storedUtc: string,
): Conversion {
  if (conversion.kind === "ms" && conversion.ms === Date.parse(storedUtc)) {
    return { kind: "skip" };
  }
  return conversion;
}

function endInPastIssues(end: Conversion, nowMs: number): FormIssue[] {
  if (end.kind !== "ms" || end.ms > nowMs) return [];
  return [
    issueAt(
      ["schedule", "endTimeOfDay"],
      "The end time must be in the future.",
    ),
  ];
}

/** The end-after-start issue if there is one, otherwise the end-in-the-past one. */
function endIssues(
  start: Conversion,
  changedEnd: Conversion,
  end: Conversion,
  nowMs: number,
): FormIssue[] {
  const notAfterStart = endNotAfterStartIssues(start, end);
  if (notAfterStart.length > 0) return notAfterStart;
  return endInPastIssues(changedEnd, nowMs);
}

/**
 * Checks an edited schedule. An unchanged start or end may be in the past, a
 * changed one may not, and the end must come after the start. The end-after-start
 * message replaces the end-in-the-past one when both apply.
 */
export function editScheduleIssues(
  boxes: EditScheduleBoxes,
  loaded: LoadedSchedule,
  nowMs: number,
): FormIssue[] {
  const start = toUtcMsOrIssue(
    { date: boxes.startDate, timeOfDay: boxes.startTimeOfDay },
    boxes.timeZone,
  );
  const end = toUtcMsOrIssue(
    { date: boxes.endDate, timeOfDay: boxes.endTimeOfDay },
    boxes.timeZone,
  );
  return [
    ...conversionIssues(start, end),
    ...startInPastIssues(onlyWhenChanged(start, loaded.startTime), nowMs),
    ...endIssues(start, onlyWhenChanged(end, loaded.endTime), end, nowMs),
  ];
}
