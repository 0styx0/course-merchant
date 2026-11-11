import { describe, expect, it } from "vitest";

import type { Course } from "@/lib/types";
import { makeVisitorTimeLine } from "./visitor-time";

// Intl puts thin spaces (U+2009) around the range's dash.
const THIN = "\u2009";

function makeSchedule(
  startTime: string,
  endTime: string,
  timeZone: string,
): Course["schedule"] {
  return { startTime, endTime, timeZone };
}

const newYorkWinterAfternoon = makeSchedule(
  "2030-01-15T20:00:00Z",
  "2030-01-15T22:00:00Z",
  "America/New_York",
);

describe("makeVisitorTimeLine", () => {
  it("shows no line when the visitor's offset at the start matches the course's", () => {
    expect(
      makeVisitorTimeLine(newYorkWinterAfternoon, "en-US", "America/Toronto"),
    ).toBeUndefined();
  });

  it("writes the visitor's times and zone when the offset differs and the dates match", () => {
    expect(
      makeVisitorTimeLine(
        newYorkWinterAfternoon,
        "en-US",
        "America/Los_Angeles",
      ),
    ).toBe(`(12:00${THIN}–${THIN}2:00 PM PST your time)`);
  });

  it("adds the date when the visitor's start falls on another day", () => {
    expect(
      makeVisitorTimeLine(newYorkWinterAfternoon, "en-US", "Asia/Tokyo"),
    ).toBe(`(Wed, Jan 16, 5:00${THIN}–${THIN}7:00 AM GMT+9 your time)`);
  });

  it("prints both days when only the visitor's end falls on another day", () => {
    const eveningInLisbon = makeSchedule(
      "2030-12-01T21:00:00Z",
      "2030-12-01T23:00:00Z",
      "Europe/Lisbon",
    );

    expect(makeVisitorTimeLine(eveningInLisbon, "en-GB", "Europe/Athens")).toBe(
      `(Sun 1 Dec, 23:00 EET${THIN}–${THIN}Mon 2 Dec, 01:00 EET your time)`,
    );
  });

  it("compares offsets at the start instant on a day when only one zone has switched", () => {
    // 2030-03-10: the US moved to daylight time; London did not until March 31.
    const sundayInNewYork = makeSchedule(
      "2030-03-10T18:00:00Z",
      "2030-03-10T20:00:00Z",
      "America/New_York",
    );

    expect(makeVisitorTimeLine(sundayInNewYork, "en-US", "Europe/London")).toBe(
      `(6:00${THIN}–${THIN}8:00 PM GMT your time)`,
    );
  });

  it("shows no line when the offsets match only at the start instant", () => {
    // London turned to summer time at 01:00 UTC on 2030-03-31, so from the 10:00 start it matches Lagos; in winter it did not.
    const londonSpringMorning = makeSchedule(
      "2030-03-31T10:00:00Z",
      "2030-03-31T12:00:00Z",
      "Europe/London",
    );

    expect(
      makeVisitorTimeLine(londonSpringMorning, "en-GB", "Africa/Lagos"),
    ).toBeUndefined();
  });

  it("shows no line for a zone Temporal can't use", () => {
    expect(
      makeVisitorTimeLine(newYorkWinterAfternoon, "en-US", "Not/AZone"),
    ).toBeUndefined();
  });
});
