"use client";

import { Temporal } from "temporal-polyfill";

import type { Course } from "@/lib/types";
import { useVisitorTimeZone } from "./use-visitor-time-zone";

const MOST_DAYS_AHEAD_IN_WORDS = 14;

type StartWordsProps = {
  schedule: Course["schedule"];
  /** The words the server renders, such as "Starts Dec 1, 2026". */
  serverWords: string;
};

/**
 * "Starts today", "Starts tomorrow" or "Starts in 4 days", counted in the
 * visitor's calendar days. Keeps the server's words until hydration, 15 or more
 * days ahead, after the start, and when the visitor's zone is not usable.
 * The server picked the upcoming panel from its own clock, so a browser clock
 * past the start keeps the server's words and the panel never changes shape.
 */
export function StartWords({ schedule, serverWords }: StartWordsProps) {
  const visitorTimeZone = useVisitorTimeZone();
  const relativeWords =
    visitorTimeZone && makeRelativeStartWords(schedule, visitorTimeZone);
  return <>{relativeWords || serverWords}</>;
}

// Reads the clock through `Date.now`, which Playwright's `page.clock` and Vitest's
// fake timers replace; the polyfill's `Temporal.Now` keeps reading the machine clock.
function getNow() {
  return Temporal.Instant.fromEpochMilliseconds(Date.now());
}

function hasStarted(schedule: Course["schedule"]) {
  return (
    Temporal.Instant.compare(
      Temporal.Instant.from(schedule.startTime),
      getNow(),
    ) <= 0
  );
}

function countVisitorDaysUntilStart(
  schedule: Course["schedule"],
  visitorTimeZone: string,
) {
  const today = getNow().toZonedDateTimeISO(visitorTimeZone).toPlainDate();
  const startDate = Temporal.Instant.from(schedule.startTime)
    .toZonedDateTimeISO(visitorTimeZone)
    .toPlainDate();
  return today.until(startDate, { largestUnit: "day" }).days;
}

// Throws for a zone Temporal can't use; the catch turns that into no words.
function makeRelativeStartWords(
  schedule: Course["schedule"],
  visitorTimeZone: string,
): string | undefined {
  try {
    if (hasStarted(schedule)) return undefined;
    const days = countVisitorDaysUntilStart(schedule, visitorTimeZone);
    if (days > MOST_DAYS_AHEAD_IN_WORDS) return undefined;
    const relativeDay = new Intl.RelativeTimeFormat("en", {
      numeric: "auto",
    }).format(days, "day");
    return `Starts ${relativeDay}`;
  } catch {
    return undefined;
  }
}
