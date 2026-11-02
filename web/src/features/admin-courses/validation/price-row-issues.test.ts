import { describe, expect, it } from "vitest";

import { priceRowIssues, type LoadedFuturePrice } from "./price-row-issues";

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

    it("refuses a time under a minute ahead, in the caller's words", () => {
      expect(issuesFor([row("10", "2026-06-01T12:00")])).toEqual([
        tooSoonAt(0),
      ]);
    });

    it("uses create's words when create passes them", () => {
      const issues = priceRowIssues([row("10", "2026-06-01T12:00")], {
        timeZone: ZONE,
        nowMs: NOW,
        loadedFuturePrices: [],
        emptyStartWords: "when the course is saved",
      });
      expect(issues).toEqual([tooSoonAt(0, "when the course is saved")]);
    });
  });

  it("gives create's daylight-saving message for a loaded price in a repeated hour", () => {
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
