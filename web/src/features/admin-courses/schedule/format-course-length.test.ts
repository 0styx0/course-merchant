import { describe, expect, it } from "vitest";

import { formatCourseLength } from "./format-course-length";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe("formatCourseLength", () => {
  it.each([
    [2 * HOUR + 30 * MINUTE, "2 hours 30 minutes"],
    [HOUR, "1 hour"],
    [MINUTE, "1 minute"],
    [3 * DAY + HOUR, "3 days 1 hour"],
    [DAY, "1 day"],
    [0, "0 minutes"],
  ])("shows %d ms as %s", (durationMs, expected) => {
    expect(formatCourseLength(durationMs)).toBe(expected);
  });

  it("drops seconds", () => {
    expect(formatCourseLength(MINUTE + 59_000)).toBe("1 minute");
  });
});
