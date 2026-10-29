import { describe, expect, it } from "vitest";

import {
  formatCourseLength,
  priceSummary,
  scheduleSummary,
} from "./format-course-length";

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

describe("priceSummary", () => {
  const zone = "America/New_York";
  const price = (amountDollars: string, date = "", time = "") => ({
    amountDollars,
    effectiveDate: date,
    effectiveTimeOfDay: time,
  });
  const texts = (prices: ReturnType<typeof price>[], timeZone = zone) =>
    priceSummary(prices, timeZone).lines.map((parts) =>
      parts.map(({ text }) => text).join(""),
    );
  const errorTexts = (prices: ReturnType<typeof price>[]) =>
    priceSummary(prices, zone).lines.map((parts) =>
      parts.filter(({ isError }) => isError).map(({ text }) => text),
    );

  it("lists one price starting when published", () => {
    expect(texts([price("99")])).toEqual([
      "$99 from when the course is published",
    ]);
    expect(priceSummary([price("99")], zone).timeZone).toBe(zone);
  });

  it("lists prices in start order, whatever the row order", () => {
    expect(
      texts([
        price("79", "2030-02-01", "09:00"),
        price("99"),
        price("59.5", "2030-01-15", "18:00"),
      ]),
    ).toEqual([
      "$99 from when the course is published",
      "$59.50 from Jan 15, 2030, 6:00 PM",
      "$79 from Feb 1, 2030, 9:00 AM",
    ]);
  });

  it("reads zero as Free and a comma as the decimal mark", () => {
    expect(texts([price("79,5"), price("0", "2030-02-01", "09:00")])).toEqual([
      "$79.50 from when the course is published",
      "Free from Feb 1, 2030, 9:00 AM",
    ]);
  });

  it("shows moments in the chosen zone", () => {
    const row = [price("99", "2030-02-01", "09:00")];
    expect(texts(row, "Asia/Tokyo")).toEqual(["$99 from Feb 1, 2030, 9:00 AM"]);
    expect(priceSummary(row, "Asia/Tokyo").timeZone).toBe("Asia/Tokyo");
  });

  it("replaces only the invalid amount with Error", () => {
    const rows = [price("abc", "2030-02-01", "09:00")];
    expect(texts(rows)).toEqual(["$Error from Feb 1, 2030, 9:00 AM"]);
    expect(errorTexts(rows)).toEqual([["Error"]]);
  });

  it.each([
    ["a date without a time", price("1", "2030-02-01", "")],
    ["a time without a date", price("1", "", "09:00")],
    ["an impossible date", price("1", "2030-02-31", "09:00")],
  ])("replaces only the start with Error for %s", (_name, row) => {
    expect(texts([row])).toEqual(["$1 from Error"]);
    expect(errorTexts([row])).toEqual([["Error"]]);
  });

  it("marks the start of the later of two prices starting together", () => {
    expect(texts([price("99"), price("79")])).toEqual([
      "$99 from when the course is published",
      "$79 from Error",
    ]);
  });

  it("puts prices with an Error start after the dated ones", () => {
    expect(
      texts([price("1", "2030-02-01", ""), price("2", "2030-03-01", "09:00")]),
    ).toEqual(["$2 from Mar 1, 2030, 9:00 AM", "$1 from Error"]);
  });

  it("shows an empty line, not an error, for a price not given", () => {
    expect(texts([price(""), price("5")])).toEqual([
      "",
      "$5 from when the course is published",
    ]);
    expect(errorTexts([price("", "2030-02-01", "")])).toEqual([[]]);
  });
});
