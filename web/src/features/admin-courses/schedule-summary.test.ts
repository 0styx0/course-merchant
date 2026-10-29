import { describe, expect, it } from "vitest";

import { scheduleSummary } from "./schedule-summary";

describe("scheduleSummary", () => {
  const complete = {
    startDate: "2030-01-10",
    startTimeOfDay: "09:00",
    endDate: "2030-01-10",
    endTimeOfDay: "11:30",
    timeZone: "America/New_York",
  };

  it("describes a complete schedule in the chosen zone", () => {
    expect(scheduleSummary(complete)).toBe(
      "Runs Jan 10, 2030, 9:00 AM to Jan 10, 2030, 11:30 AM (America/New_York). Lasts 2 hours 30 minutes.",
    );
  });

  it("is empty while a box is empty", () => {
    expect(scheduleSummary({ ...complete, endTimeOfDay: "" })).toBeUndefined();
  });

  it("is empty when the end is not after the start", () => {
    expect(
      scheduleSummary({ ...complete, endTimeOfDay: "09:00" }),
    ).toBeUndefined();
  });

  it("is empty for an unknown time zone", () => {
    expect(
      scheduleSummary({ ...complete, timeZone: "Mars/Base" }),
    ).toBeUndefined();
  });

  it("counts a daylight-saving day by real elapsed time", () => {
    // Clocks in New York jump from 02:00 to 03:00 on 2030-03-10.
    expect(
      scheduleSummary({
        ...complete,
        startDate: "2030-03-10",
        startTimeOfDay: "00:00",
        endDate: "2030-03-10",
        endTimeOfDay: "06:00",
      }),
    ).toContain("Lasts 5 hours.");
  });
});
