import { Temporal } from "temporal-polyfill";

import type { Result } from "@/lib/types";

export type WallClockFailureReason =
  "invalid-time" | "unknown-zone" | "daylight-saving";

export type WallClockToUtcResult = Result<string, WallClockFailureReason>;

// What a `datetime-local` input gives: a date and a time, never a date alone.
const WALL_CLOCK_FORMAT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/;

function failure(error: WallClockFailureReason): WallClockToUtcResult {
  return { state: "failure", error };
}

/**
 * Turns a `datetime-local` value ("2026-11-01T01:30") and an IANA time zone
 * into a UTC ISO string ending in `Z`. A time the zone skips or repeats because
 * of a daylight-saving change is refused rather than guessed.
 */
export function wallClockToUtc(
  wallClock: string,
  timeZone: string,
): WallClockToUtcResult {
  if (!WALL_CLOCK_FORMAT.test(wallClock)) return failure("invalid-time");

  let dateTime: Temporal.PlainDateTime;
  try {
    dateTime = Temporal.PlainDateTime.from(wallClock, { overflow: "reject" });
  } catch {
    return failure("invalid-time");
  }

  try {
    dateTime.toZonedDateTime(timeZone);
  } catch {
    return failure("unknown-zone");
  }

  try {
    const zoned = dateTime.toZonedDateTime(timeZone, {
      disambiguation: "reject",
    });
    return { state: "success", data: zoned.toInstant().toString() };
  } catch {
    return failure("daylight-saving");
  }
}
