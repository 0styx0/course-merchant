import { describe, expect, it } from "vitest";

import { getCourseStage } from "./course-stage";

const schedule = {
  startTime: "2030-10-01T18:00:00Z",
  endTime: "2030-10-01T20:00:00Z",
  timeZone: "America/New_York",
};

describe("getCourseStage", () => {
  it.each([
    [
      "one millisecond before the start",
      "2030-10-01T17:59:59.999Z",
      "upcoming",
    ],
    ["exactly the start", "2030-10-01T18:00:00Z", "in-progress"],
    [
      "one millisecond before the end",
      "2030-10-01T19:59:59.999Z",
      "in-progress",
    ],
    ["exactly the end", "2030-10-01T20:00:00Z", "ended"],
    ["after the end", "2031-01-01T00:00:00Z", "ended"],
  ])("is %s: %s -> %s", (_label, now, expected) => {
    expect(getCourseStage(schedule, new Date(now))).toBe(expected);
  });
});
