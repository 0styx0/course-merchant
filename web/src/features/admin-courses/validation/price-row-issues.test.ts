import { describe, expect, it } from "vitest";

import {
  priceRowIssues,
  priceStartProblem,
  type LoadedFuturePrice,
} from "./price-row-issues";

// 2026-06-01 12:00 in New York is 16:00 UTC.
const NOW = Date.parse("2026-06-01T16:00:00Z");
const ZONE = "America/New_York";
const EDIT_WORDS = "when you save";

const row = (amountDollars: string, wallClock: string) => {
  const [effectiveDate = "", effectiveTimeOfDay = ""] = wallClock.split("T");
  return { amountDollars, effectiveDate, effectiveTimeOfDay };
};

const issuesFor = (
  rows: ReturnType<typeof row>[],
  loadedFuturePrices: LoadedFuturePrice[] = [],
  timeZone = ZONE,
) =>
  priceRowIssues(rows, {
    timeZone,
    nowMs: NOW,
    loadedFuturePrices,
    emptyStartWords: EDIT_WORDS,
  });

const tooSoonAt = (index: number, words = EDIT_WORDS) => ({
  path: ["prices", index, "effectiveTimeOfDay"],
  message: `Choose a time at least a minute from now, or leave both empty to start ${words}.`,
});

const pastDayAt = (index: number, words = EDIT_WORDS) => ({
  path: ["prices", index, "effectiveDate"],
  message: `Choose a date that isn't in the past, or leave both empty to start ${words}.`,
});

// Loaded when the page rendered, and since passed: 09:00 in New York today.
const passedPrice = { amount: 7950, effectiveAt: "2026-06-01T13:00:00Z" };
// 15 seconds ago; the boxes show it as 11:59.
const passedWithSeconds = { amount: 7950, effectiveAt: "2026-06-01T15:59:45Z" };

describe("priceRowIssues", () => {
  describe("an unchanged row", () => {
    it("may start in the past", () => {
      const rows = [row("79.50", "2026-06-01T09:00")];
      expect(issuesFor(rows, [passedPrice])).toEqual([]);
    });

    it("stays unchanged when the loaded time has seconds", () => {
      const rows = [row("79.50", "2026-06-01T11:59")];
      expect(issuesFor(rows, [passedWithSeconds])).toEqual([]);
    });

    it("matches the amount typed with a comma", () => {
      const rows = [row("79,5", "2026-06-01T09:00")];
      expect(issuesFor(rows, [passedPrice])).toEqual([]);
    });
  });

  describe("which box a past start shows on", () => {
    it("shows the message on the date box", () => {
      expect(issuesFor([row("10", "2026-05-31T15:00")])).toEqual([
        pastDayAt(0),
      ]);
    });

    it("uses the caller's words", () => {
      const issues = priceRowIssues([row("10", "2026-05-31T15:00")], {
        timeZone: ZONE,
        nowMs: NOW,
        loadedFuturePrices: [],
        emptyStartWords: "when the course is published",
      });
      expect(issues).toEqual([pastDayAt(0, "when the course is published")]);
    });

    it("shows a changed amount on a loaded price from a passed day on the date box", () => {
      const loaded = { amount: 7950, effectiveAt: "2026-05-30T13:00:00Z" };
      expect(issuesFor([row("80", "2026-05-30T09:00")], [loaded])).toEqual([
        pastDayAt(0),
      ]);
    });

    it("leaves an unchanged loaded price from a passed day alone", () => {
      const loaded = { amount: 7950, effectiveAt: "2026-05-30T13:00:00Z" };
      expect(issuesFor([row("79.50", "2026-05-30T09:00")], [loaded])).toEqual(
        [],
      );
    });

    it("judges the day in the course's zone, not in UTC", () => {
      // 2026-06-01 02:00 UTC is still May 31 in New York (22:00).
      const lateNow = Date.parse("2026-06-01T02:00:00Z");
      const options = {
        timeZone: ZONE,
        nowMs: lateNow,
        loadedFuturePrices: [],
        emptyStartWords: EDIT_WORDS,
      };
      expect(priceRowIssues([row("10", "2026-05-31T09:00")], options)).toEqual([
        tooSoonAt(0),
      ]);
      expect(priceRowIssues([row("10", "2026-05-30T09:00")], options)).toEqual([
        pastDayAt(0),
      ]);
    });

    it("keeps a time 30 seconds ahead today on the time box", () => {
      const options = {
        timeZone: "UTC",
        nowMs: Date.parse("2026-06-01T12:00:30Z"),
        loadedFuturePrices: [],
        emptyStartWords: EDIT_WORDS,
      };
      expect(priceRowIssues([row("10", "2026-06-01T12:01")], options)).toEqual([
        tooSoonAt(0),
      ]);
    });

    it("does not count today as passed at 23:59:30", () => {
      const options = {
        timeZone: "UTC",
        nowMs: Date.parse("2026-06-01T23:59:30Z"),
        loadedFuturePrices: [],
        emptyStartWords: EDIT_WORDS,
      };
      expect(priceRowIssues([row("10", "2026-06-01T23:59")], options)).toEqual([
        tooSoonAt(0),
      ]);
    });
  });

  describe("a changed row", () => {
    it("counts a time moved by a minute as changed, even when the loaded time has seconds", () => {
      const rows = [row("79.50", "2026-06-01T12:00")];
      expect(issuesFor(rows, [passedWithSeconds])).toEqual([tooSoonAt(0)]);
    });

    it("counts a changed amount at the loaded time as changed", () => {
      const rows = [row("80", "2026-06-01T09:00")];
      expect(issuesFor(rows, [passedPrice])).toEqual([tooSoonAt(0)]);
    });

    it("counts a row whose time moved with a zone change as changed", () => {
      const rows = [row("79.50", "2026-06-01T09:00")];
      expect(issuesFor(rows, [passedPrice], "America/Chicago")).toEqual([
        tooSoonAt(0),
      ]);
    });

    it("accepts a time two minutes ahead", () => {
      expect(issuesFor([row("10", "2026-06-01T12:02")])).toEqual([]);
    });

    it("refuses a time under a minute ahead, in edit's words", () => {
      expect(issuesFor([row("10", "2026-06-01T12:00")])).toEqual([
        tooSoonAt(0),
      ]);
    });

    it("uses create's words when create passes them", () => {
      const issues = priceRowIssues([row("10", "2026-06-01T12:00")], {
        timeZone: ZONE,
        nowMs: NOW,
        loadedFuturePrices: [],
        emptyStartWords: "when the course is published",
      });
      expect(issues).toEqual([tooSoonAt(0, "when the course is published")]);
    });
  });

  it("gives the daylight-saving message for a loaded price in a repeated hour", () => {
    // 01:30 happens twice in New York on 2026-11-01.
    const loaded = { amount: 7950, effectiveAt: "2026-11-01T05:30:00Z" };
    expect(issuesFor([row("79.50", "2026-11-01T01:30")], [loaded])).toEqual([
      {
        path: ["prices", 0, "effectiveTimeOfDay"],
        message: `That time doesn't exist, or happens twice, on that day in ${ZONE} because of a daylight-saving change. Choose another time.`,
      },
    ]);
  });

  describe("two rows at the same moment", () => {
    const sameTimeAt = (index: number) => ({
      path: ["prices", index, "effectiveTimeOfDay"],
      message: "Two prices can't take effect at the same time.",
    });

    it("refuses the later row", () => {
      const rows = [
        row("10", "2026-07-01T09:00"),
        row("20", "2026-07-01T09:00"),
      ];
      expect(issuesFor(rows)).toEqual([sameTimeAt(1)]);
    });

    it("refuses a changed row at an unchanged row's moment", () => {
      const loaded = { amount: 7950, effectiveAt: "2026-07-01T13:00:00Z" };
      const rows = [
        row("79.50", "2026-07-01T09:00"),
        row("20", "2026-07-01T09:00"),
      ];
      expect(issuesFor(rows, [loaded])).toEqual([sameTimeAt(1)]);
    });
  });

  describe("a half-filled row", () => {
    it("asks for the time when only a date is entered", () => {
      expect(issuesFor([row("10", "2026-07-01")])).toEqual([
        {
          path: ["prices", 0, "effectiveTimeOfDay"],
          message: "Enter a time, or clear the date.",
        },
      ]);
    });

    it("asks for the date when only a time is entered", () => {
      expect(issuesFor([row("10", "T09:00")])).toEqual([
        {
          path: ["prices", 0, "effectiveDate"],
          message: "Enter a date, or clear the time.",
        },
      ]);
    });
  });
});

describe("priceStartProblem", () => {
  const problemOf = (date: string, timeOfDay: string) =>
    priceStartProblem(
      { effectiveDate: date, effectiveTimeOfDay: timeOfDay },
      ZONE,
    );

  it.each([
    ["a date without a time", "2030-02-01", "", "needs-time"],
    ["a time without a date", "", "09:00", "needs-date"],
    ["an impossible date", "2030-02-31", "09:00", "invalid-time"],
    ["a time the zone skips", "2030-03-10", "02:30", "skipped-time"],
  ])("names the problem for %s", (_name, date, time, problem) => {
    expect(problemOf(date, time)).toBe(problem);
  });

  it("finds nothing wrong with a full start, or an empty one", () => {
    expect(problemOf("2030-02-01", "09:00")).toBeUndefined();
    expect(problemOf("", "")).toBeUndefined();
  });

  it("names an unknown zone for a full start, and nothing for an empty one", () => {
    const inUnknownZone = (date: string, timeOfDay: string) =>
      priceStartProblem(
        { effectiveDate: date, effectiveTimeOfDay: timeOfDay },
        "Mars/Base",
      );
    expect(inUnknownZone("2030-02-01", "09:00")).toBe("unknown-zone");
    expect(inUnknownZone("", "")).toBeUndefined();
  });
});
