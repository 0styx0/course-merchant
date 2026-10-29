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

function parseDateTime(wallClock: string): Temporal.PlainDateTime | undefined {
  try {
    return Temporal.PlainDateTime.from(wallClock, { overflow: "reject" });
  } catch {
    return undefined;
  }
}

function isKnownTimeZone(
  dateTime: Temporal.PlainDateTime,
  timeZone: string,
): boolean {
  try {
    dateTime.toZonedDateTime(timeZone);
    return true;
  } catch {
    return false;
  }
}

// `undefined` when the time is skipped or repeated by a daylight-saving change.
function toUtcInstant(
  dateTime: Temporal.PlainDateTime,
  timeZone: string,
): string | undefined {
  try {
    return dateTime
      .toZonedDateTime(timeZone, { disambiguation: "reject" })
      .toInstant()
      .toString();
  } catch {
    return undefined;
  }
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

  const dateTime = parseDateTime(wallClock);
  if (!dateTime) return failure("invalid-time");
  if (!isKnownTimeZone(dateTime, timeZone)) return failure("unknown-zone");

  const instant = toUtcInstant(dateTime, timeZone);
  if (!instant) return failure("daylight-saving");
  return { state: "success", data: instant };
}
