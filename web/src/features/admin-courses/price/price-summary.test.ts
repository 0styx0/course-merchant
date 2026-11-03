import { describe, expect, it } from "vitest";

import { priceSummary } from "./price-summary";

describe("priceSummary", () => {
  const zone = "America/New_York";
  const price = (amountDollars: string, date = "", time = "") => ({
    amountDollars,
    effectiveDate: date,
    effectiveTimeOfDay: time,
  });
  const startText = (timeZone: string) => ({
    timeZone,
    textForEmptyStart: "when the course is published",
  });
  const summaryOf = (prices: ReturnType<typeof price>[], timeZone = zone) => {
    const summary = priceSummary(prices, startText(timeZone));
    if (!summary) throw new Error("expected a summary");
    return summary;
  };
  const texts = (prices: ReturnType<typeof price>[], timeZone = zone) =>
    summaryOf(prices, timeZone).lines.map((parts) =>
      parts.map(({ text }) => text).join(""),
    );
  const errorTexts = (prices: ReturnType<typeof price>[]) =>
    summaryOf(prices).lines.map((parts) =>
      parts.filter(({ isError }) => isError).map(({ text }) => text),
    );

  it("lists one price starting when published", () => {
    expect(texts([price("99")])).toEqual([
      "$99.00 from when the course is published",
    ]);
    expect(summaryOf([price("99")]).timeZone).toBe(zone);
  });

  it("lists prices in start order, whatever the row order", () => {
    expect(
      texts([
        price("79", "2030-02-01", "09:00"),
        price("99"),
        price("59.5", "2030-01-15", "18:00"),
      ]),
    ).toEqual([
      "$99.00 from when the course is published",
      "$59.50 from Jan 15, 2030, 6:00 PM",
      "$79.00 from Feb 1, 2030, 9:00 AM",
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
    expect(texts(row, "Asia/Tokyo")).toEqual([
      "$99.00 from Feb 1, 2030, 9:00 AM",
    ]);
    expect(summaryOf(row, "Asia/Tokyo").timeZone).toBe("Asia/Tokyo");
  });

  it("says in words that the amount needs fixing", () => {
    const rows = [price("abc", "2030-02-01", "09:00")];
    expect(texts(rows)).toEqual([
      "(price needs fixing) from Feb 1, 2030, 9:00 AM",
    ]);
    expect(errorTexts(rows)).toEqual([["(price needs fixing)"]]);
  });

  it.each([
    ["a date without a time", price("1", "2030-02-01", ""), "needs a time"],
    ["a time without a date", price("1", "", "09:00"), "needs a date"],
    [
      "an impossible date",
      price("1", "2030-02-31", "09:00"),
      "date or time isn't valid",
    ],
    [
      "a time the zone skips",
      price("1", "2030-03-10", "02:30"),
      "time doesn't exist in this zone",
    ],
  ])("says what is wrong with the start for %s", (_name, row, words) => {
    expect(texts([row])).toEqual([`$1.00 from (${words})`]);
    expect(errorTexts([row])).toEqual([[`(${words})`]]);
  });

  it("asks for a valid zone, not a different start, when the zone is unknown", () => {
    const rows = [price("1", "2030-02-01", "09:00")];
    expect(texts(rows, "Mars/Base")).toEqual([
      "$1.00 from (needs a valid zone)",
    ]);
  });

  it("marks the start of the later of two prices starting together", () => {
    expect(texts([price("99"), price("79")])).toEqual([
      "$99.00 from when the course is published",
      "$79.00 from (same start as another price)",
    ]);
  });

  it("reads a typed whole amount with cents", () => {
    expect(texts([price("50")])).toEqual([
      "$50.00 from when the course is published",
    ]);
  });

  it("puts prices with a broken start after the dated ones", () => {
    expect(
      texts([price("1", "2030-02-01", ""), price("2", "2030-03-01", "09:00")]),
    ).toEqual(["$2.00 from Mar 1, 2030, 9:00 AM", "$1.00 from (needs a time)"]);
  });

  it("shows an empty line, not an error, for a price not given", () => {
    expect(texts([price(""), price("5")])).toEqual([
      "",
      "$5.00 from when the course is published",
    ]);
    expect(errorTexts([price("", "2030-02-01", "")])).toEqual([[]]);
  });

  it("returns nothing while every price input is empty", () => {
    expect(priceSummary([price("")], startText(zone))).toBeUndefined();
    expect(
      priceSummary([price(""), price("")], startText(zone)),
    ).toBeUndefined();
  });

  it("counts spaces alone as empty", () => {
    expect(
      priceSummary([price("  ", " ", " ")], startText(zone)),
    ).toBeUndefined();
  });

  it.each([
    ["an amount", price("5")],
    ["only a start date", price("", "2030-02-01", "")],
    ["only a start time", price("", "", "09:00")],
  ])("returns the summary once there is %s", (_name, row) => {
    expect(priceSummary([row], startText(zone))).toBeDefined();
  });

  it("returns the summary when only a later row has text", () => {
    expect(texts([price(""), price("5")])).toEqual([
      "",
      "$5.00 from when the course is published",
    ]);
  });
});
