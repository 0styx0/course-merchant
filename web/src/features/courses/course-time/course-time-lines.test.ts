import { describe, expect, it } from "vitest";

import type { Course } from "@/lib/types";
import { makeCourseTimeLines } from "./course-time-lines";

// Intl writes thin and no-break spaces inside ranges; the expected strings use plain spaces.
function makeLinesWithPlainSpaces(
  schedule: Course["schedule"],
  locale: string,
) {
  const lines = makeCourseTimeLines(schedule, locale);
  return {
    timeOrDateRangeLine: lines.timeOrDateRangeLine.replace(/\s/g, " "),
    firstStartToLastEndLine: lines.firstStartToLastEndLine?.replace(/\s/g, " "),
    lengthLine: lines.lengthLine,
    endedDateLine: lines.endedDateLine.replace(/\s/g, " "),
    shouldShowVisitorTimeLine: lines.shouldShowVisitorTimeLine,
  };
}

function newYorkSchedule(
  startTime: string,
  endTime: string,
): Course["schedule"] {
  return { startTime, endTime, timeZone: "America/New_York" };
}

const twoHoursOnOctober1 = newYorkSchedule(
  "2030-10-01T18:00:00Z",
  "2030-10-01T20:00:00Z",
);

describe("makeCourseTimeLines for a course within one day", () => {
  it("writes en-US as one range with the zone's short name", () => {
    const lines = makeLinesWithPlainSpaces(twoHoursOnOctober1, "en-US");

    expect(lines.timeOrDateRangeLine).toBe(`Tue, Oct 1, 2:00 – 4:00 PM EDT`);
    expect(lines.firstStartToLastEndLine).toBeUndefined();
  });

  it("writes en-GB on a 24-hour clock with an offset name", () => {
    expect(
      makeLinesWithPlainSpaces(twoHoursOnOctober1, "en-GB").timeOrDateRangeLine,
    ).toBe("Tue 1 Oct, 14:00–16:00 GMT-4");
  });

  it("writes de-DE with Uhr", () => {
    expect(
      makeLinesWithPlainSpaces(twoHoursOnOctober1, "de-DE").timeOrDateRangeLine,
    ).toBe("Di., 1. Okt., 14:00–16:00 Uhr GMT-4");
  });

  it("keeps one line with both days when a course under 24 hours passes midnight", () => {
    const lines = makeLinesWithPlainSpaces(
      newYorkSchedule("2026-12-02T03:00:00Z", "2026-12-02T09:00:00Z"),
      "en-US",
    );

    expect(lines.timeOrDateRangeLine).toBe(
      `Tue, Dec 1, 10:00 PM EST – Wed, Dec 2, 4:00 AM EST`,
    );
    expect(lines.firstStartToLastEndLine).toBeUndefined();
  });

  it("keeps one line for a course 1 minute under 24 hours", () => {
    const lines = makeLinesWithPlainSpaces(
      newYorkSchedule("2026-12-01T15:00:00Z", "2026-12-02T14:59:00Z"),
      "en-US",
    );

    expect(lines.timeOrDateRangeLine).toBe(
      "Tue, Dec 1, 10:00 AM EST – Wed, Dec 2, 9:59 AM EST",
    );
    expect(lines.firstStartToLastEndLine).toBeUndefined();
  });
});

describe("makeCourseTimeLines for a course of 24 hours or more", () => {
  const threeDays = newYorkSchedule(
    "2026-12-01T23:00:00Z",
    "2026-12-04T01:00:00Z",
  );

  it("shows the date range above the first start and last end with weekdays", () => {
    const lines = makeLinesWithPlainSpaces(threeDays, "en-US");

    expect(lines.timeOrDateRangeLine).toBe(`Dec 1 – 3, 2026`);
    expect(lines.firstStartToLastEndLine).toBe(
      `Tue, Dec 1, 6:00 PM EST – Thu, Dec 3, 8:00 PM EST`,
    );
  });

  it("writes the date range in the visitor's locale", () => {
    expect(
      makeLinesWithPlainSpaces(threeDays, "en-GB").timeOrDateRangeLine,
    ).toBe(`1 – 3 Dec 2026`);
  });

  it("switches to the date range at exactly 24 hours", () => {
    const lines = makeLinesWithPlainSpaces(
      newYorkSchedule("2026-12-01T15:00:00Z", "2026-12-02T15:00:00Z"),
      "en-US",
    );

    expect(lines.timeOrDateRangeLine).toBe(`Dec 1 – 2, 2026`);
    expect(lines.firstStartToLastEndLine).toBe(
      "Tue, Dec 1, 10:00 AM EST – Wed, Dec 2, 10:00 AM EST",
    );
  });
});

describe("makeCourseTimeLines length line", () => {
  it("reads whole hours", () => {
    expect(
      makeLinesWithPlainSpaces(twoHoursOnOctober1, "en-US").lengthLine,
    ).toBe("2 hours");
  });

  it("reads hours and minutes", () => {
    const lines = makeLinesWithPlainSpaces(
      newYorkSchedule("2030-10-01T18:00:00Z", "2030-10-01T19:30:00Z"),
      "en-US",
    );

    expect(lines.lengthLine).toBe("1 hour 30 minutes");
  });

  it("reads days and hours", () => {
    const lines = makeLinesWithPlainSpaces(
      newYorkSchedule("2026-12-01T23:00:00Z", "2026-12-04T01:00:00Z"),
      "en-US",
    );

    expect(lines.lengthLine).toBe("2 days 2 hours");
  });
});

describe("makeCourseTimeLines for a course of 28 days or more", () => {
  const exactly28Days = newYorkSchedule(
    "2026-12-01T15:00:00Z",
    "2026-12-29T15:00:00Z",
  );

  it("shows only the date range at exactly 28 days", () => {
    const lines = makeLinesWithPlainSpaces(exactly28Days, "en-US");

    expect(lines.timeOrDateRangeLine).toBe("Dec 1 – 29, 2026");
    expect(lines.firstStartToLastEndLine).toBeUndefined();
    expect(lines.lengthLine).toBeUndefined();
    expect(lines.shouldShowVisitorTimeLine).toBe(false);
    expect(lines.endedDateLine).toBe("Dec 1 – 29, 2026");
  });

  it("writes years apart in the date range of a decades-long course", () => {
    const lines = makeLinesWithPlainSpaces(
      newYorkSchedule("2019-12-31T17:00:00Z", "2040-11-30T17:00:00Z"),
      "en-US",
    );

    expect(lines.timeOrDateRangeLine).toBe("Dec 31, 2019 – Nov 30, 2040");
  });

  it("keeps all three lines at 27 days 23 hours", () => {
    const schedule = newYorkSchedule(
      "2026-12-01T15:00:00Z",
      "2026-12-29T14:00:00Z",
    );
    const lines = makeLinesWithPlainSpaces(schedule, "en-US");

    expect(lines.timeOrDateRangeLine).toBe("Dec 1 – 29, 2026");
    expect(lines.firstStartToLastEndLine).toBe(
      "Tue, Dec 1, 10:00 AM EST – Tue, Dec 29, 9:00 AM EST",
    );
    expect(lines.lengthLine).toBe("27 days 23 hours");
    expect(lines.shouldShowVisitorTimeLine).toBe(true);
    expect(lines.endedDateLine).toBe("Dec 1, 2026");
  });

  it("shows the start date and the visitor's line for a course under 24 hours", () => {
    const lines = makeLinesWithPlainSpaces(twoHoursOnOctober1, "en-US");

    expect(lines.shouldShowVisitorTimeLine).toBe(true);
    expect(lines.endedDateLine).toBe("Oct 1, 2030");
  });
});
