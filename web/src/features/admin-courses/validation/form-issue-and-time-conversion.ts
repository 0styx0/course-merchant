import { wallClockToUtc } from "@/lib/time/wall-clock-time";

export type FormIssue = { path: (string | number)[]; message: string };

export const issueAt = (
  path: (string | number)[],
  message: string,
): FormIssue => ({
  path,
  message,
});

export type Conversion =
  | { kind: "ms"; ms: number }
  | { kind: "issue"; message: string }
  | { kind: "skip" };

/** The date and time of day the admin typed, in the chosen zone. */
type DateAndTime = { date: string; timeOfDay: string };

/** Date and time of day to UTC milliseconds, or the message to show instead. */
export function toUtcMsOrIssue(
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
