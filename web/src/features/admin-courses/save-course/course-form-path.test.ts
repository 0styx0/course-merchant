import { describe, expect, it } from "vitest";

import { courseFormPath } from "./course-form-path";

describe("courseFormPath", () => {
  it.each([
    ["/name", "name"],
    ["/summary", "summary"],
    ["/contentUrl", "contentUrl"],
    ["/schedule/startTime", "schedule.startTimeOfDay"],
    ["/schedule/endTime", "schedule.endTimeOfDay"],
    ["/schedule/timeZone", "schedule.timeZone"],
    ["/prices/0/amount", "prices.0.amountDollars"],
    ["/prices/12/effectiveAt", "prices.12.effectiveTimeOfDay"],
    ["/image", "image"],
    ["/status", "status"],
    ["/description", "description"],
    ["/description/content/0/content/1/marks/0", "description"],
  ])("maps %s to %s", (pointer, path) => {
    expect(courseFormPath(pointer)).toBe(path);
  });

  it.each([
    "/status/x",
    "/prices/0/currency",
    "/prices",
    "/prices/x/amount",
    "/name/x",
  ])("returns nothing for %s, which the form has no field for", (pointer) => {
    expect(courseFormPath(pointer)).toBeUndefined();
  });
});
