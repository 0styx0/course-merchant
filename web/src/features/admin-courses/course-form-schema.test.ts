import type { JSONContent } from "@tiptap/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { courseFormSchema, type CourseFormValues } from "./course-form-schema";

// 2026-06-01 12:00 in New York is 16:00 UTC.
const NOW = new Date("2026-06-01T16:00:00Z");

const paragraph = (value: string): JSONContent => ({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text: value }] }],
});

function validValues(): CourseFormValues {
  return {
    name: "React Fundamentals",
    summary: "Learn React.",
    description: paragraph("A long description."),
    contentUrl: "https://drive.google.com/drive/folders/abc",
    schedule: {
      startDate: "2026-07-01",
      startTimeOfDay: "09:00",
      endDate: "2026-07-01",
      endTimeOfDay: "11:00",
      timeZone: "America/New_York",
    },
    prices: [
      { amountDollars: "79.50", effectiveDate: "", effectiveTimeOfDay: "" },
    ],
  };
}

/** Messages by field path, e.g. `schedule.endTimeOfDay`. */
function problems(values: CourseFormValues): Record<string, string[]> {
  const result = courseFormSchema.safeParse(values);
  const byPath: Record<string, string[]> = {};
  if (result.success) return byPath;
  for (const issue of result.error.issues) {
    const path = issue.path.join(".");
    (byPath[path] ??= []).push(issue.message);
  }
  return byPath;
}

function withValues(change: (values: CourseFormValues) => void) {
  const values = validValues();
  change(values);
  return problems(values);
}

describe("courseFormSchema", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => vi.useRealTimers());

  it("accepts a valid form", () => {
    expect(problems(validValues())).toEqual({});
  });

  describe("name and summary", () => {
    it("requires a name, even if only spaces", () => {
      expect(withValues((v) => (v.name = "   "))).toEqual({
        name: ["Enter a course name."],
      });
    });

    it("limits the name to 100 characters", () => {
      expect(withValues((v) => (v.name = "a".repeat(101)))).toEqual({
        name: ["The name must be 100 characters or fewer."],
      });
    });

    it("requires a summary", () => {
      expect(withValues((v) => (v.summary = ""))).toEqual({
        summary: ["Enter a summary."],
      });
    });

    it("trims the summary before checking its length", () => {
      expect(withValues((v) => (v.summary = ` ${"a".repeat(300)} `))).toEqual(
        {},
      );
      expect(withValues((v) => (v.summary = "a".repeat(301)))).toEqual({
        summary: ["The summary must be 300 characters or fewer."],
      });
    });
  });

  describe("description", () => {
    it.each([
      ["no paragraphs", { type: "doc", content: [] }],
      ["spaces only", paragraph("    ")],
    ])("requires visible text (%s)", (_label, description) => {
      expect(withValues((v) => (v.description = description))).toEqual({
        description: ["Enter a description."],
      });
    });

    it("allows exactly 5,000 characters and refuses more", () => {
      expect(
        withValues((v) => (v.description = paragraph("a".repeat(5000)))),
      ).toEqual({});
      expect(
        withValues((v) => (v.description = paragraph("a".repeat(5001)))),
      ).toEqual({
        description: ["The description must be 5,000 characters or fewer."],
      });
    });
  });

  describe("content link", () => {
    it("requires one", () => {
      expect(withValues((v) => (v.contentUrl = ""))).toEqual({
        contentUrl: ["Enter the link to the course material."],
      });
    });

    it.each(["drive.google.com/abc", "ftp://example.com/file", "javascript:1"])(
      "refuses %s",
      (url) => {
        expect(withValues((v) => (v.contentUrl = url))).toEqual({
          contentUrl: ["Enter a link starting with https:// or http://."],
        });
      },
    );

    it("limits the length to 2,048 characters", () => {
      const url = `https://example.com/${"a".repeat(2048)}`;
      expect(withValues((v) => (v.contentUrl = url))).toEqual({
        contentUrl: ["The link must be 2,048 characters or fewer."],
      });
    });
  });

  describe("prices", () => {
    const priceProblems = (amountDollars: string) =>
      withValues((v) => (v.prices[0].amountDollars = amountDollars));

    it("needs at least one row", () => {
      expect(withValues((v) => (v.prices = []))).toEqual({
        prices: ["Add at least one price."],
      });
    });

    it.each(["0", "0.50", "50", "79.5", "1000.00", "79,50"])(
      "accepts %s",
      (amount) => {
        expect(priceProblems(amount)).toEqual({});
      },
    );

    it.each(["", "abc", "-5", "79,5,0", "."])(
      "refuses %j as not a price",
      (a) => {
        expect(priceProblems(a)).toEqual({
          "prices.0.amountDollars": ["Enter a price, like 79.50."],
        });
      },
    );

    it.each(["1.234", "1,000"])("allows at most two decimals: %s", (a) => {
      expect(priceProblems(a)).toEqual({
        "prices.0.amountDollars": ["Use at most two decimal places."],
      });
    });

    it.each(["0.49", "0.01"])("refuses %s as under the minimum", (amount) => {
      expect(priceProblems(amount)).toEqual({
        "prices.0.amountDollars": [
          "The payment processor needs a price of at least $0.50. Enter 0 for a free course.",
        ],
      });
    });
  });

  describe("time zone", () => {
    it.each(["", "Mars/Olympus"])("refuses %j", (timeZone) => {
      expect(withValues((v) => (v.schedule.timeZone = timeZone))).toEqual({
        "schedule.timeZone": ["Choose a time zone."],
      });
    });

    it("reports a bad zone without a second message on the times", () => {
      const result = withValues((v) => (v.schedule.timeZone = "Mars/Olympus"));
      expect(Object.keys(result)).toEqual(["schedule.timeZone"]);
    });
  });

  describe("start and end times", () => {
    const startAt = (v: CourseFormValues, wallClock: string) => {
      [v.schedule.startDate, v.schedule.startTimeOfDay] = wallClock.split("T");
    };
    const endAt = (v: CourseFormValues, wallClock: string) => {
      [v.schedule.endDate, v.schedule.endTimeOfDay] = wallClock.split("T");
    };
    const dstMessage =
      "That time doesn't exist, or happens twice, on that day in America/New_York because of a daylight-saving change. Choose another time.";

    it("requires a date and a time for both", () => {
      expect(
        withValues((v) => {
          v.schedule.startDate = "";
          v.schedule.startTimeOfDay = "";
          v.schedule.endDate = "";
          v.schedule.endTimeOfDay = "";
        }),
      ).toEqual({
        "schedule.startDate": ["Enter a start date."],
        "schedule.startTimeOfDay": ["Enter a start time."],
        "schedule.endDate": ["Enter an end date."],
        "schedule.endTimeOfDay": ["Enter an end time."],
      });
    });

    it("requires the time when only the date is entered", () => {
      expect(withValues((v) => (v.schedule.startTimeOfDay = ""))).toEqual({
        "schedule.startTimeOfDay": ["Enter a start time."],
      });
    });

    it("refuses a start time in the past", () => {
      expect(
        withValues((v) => {
          startAt(v, "2026-06-01T11:59");
          endAt(v, "2026-06-01T13:00");
        }),
      ).toEqual({
        "schedule.startTimeOfDay": ["The start time must be in the future."],
      });
    });

    it("refuses an end time not after the start", () => {
      expect(withValues((v) => endAt(v, "2026-07-01T09:00"))).toEqual({
        "schedule.endTimeOfDay": ["The end time must be after the start time."],
      });
    });

    it("reports only the zone when it is empty", () => {
      const result = withValues((v) => {
        v.schedule.timeZone = "";
        endAt(v, "2026-07-01T08:00");
      });
      expect(result).toEqual({ "schedule.timeZone": ["Choose a time zone."] });
    });

    it("refuses a time that daylight saving skips", () => {
      expect(
        withValues((v) => {
          startAt(v, "2027-03-14T02:30");
          endAt(v, "2027-03-14T05:00");
        }),
      ).toEqual({ "schedule.startTimeOfDay": [dstMessage] });
    });

    it("refuses a time that daylight saving repeats", () => {
      expect(withValues((v) => endAt(v, "2026-11-01T01:30"))).toEqual({
        "schedule.endTimeOfDay": [dstMessage],
      });
    });

    it("refuses a date that does not exist", () => {
      expect(withValues((v) => (v.schedule.endDate = "2026-02-30"))).toEqual({
        "schedule.endTimeOfDay": ["Enter a valid date and time."],
      });
    });
  });

  describe("price times", () => {
    const setPrices = (v: CourseFormValues, ...wallClocks: string[]) => {
      v.prices = wallClocks.map((wallClock) => {
        const [effectiveDate = "", effectiveTimeOfDay = ""] =
          wallClock.split("T");
        return { amountDollars: "10", effectiveDate, effectiveTimeOfDay };
      });
    };
    const priceRows = (...wallClocks: string[]) =>
      withValues((v) => setPrices(v, ...wallClocks));

    it("accepts a time more than a minute ahead", () => {
      expect(priceRows("2026-06-01T12:02")).toEqual({});
    });

    it("refuses a set time under a minute ahead", () => {
      expect(priceRows("2026-06-01T12:00")).toEqual({
        "prices.0.effectiveTimeOfDay": [
          "Choose a time at least a minute from now, or leave both empty to start when the course is saved.",
        ],
      });
    });

    it("refuses two prices at the same time, on the later row", () => {
      expect(priceRows("2026-07-01T09:00", "2026-07-01T09:00")).toEqual({
        "prices.1.effectiveTimeOfDay": [
          "Two prices can't take effect at the same time.",
        ],
      });
    });

    it("refuses two prices that both start when saved", () => {
      expect(priceRows("", "")).toEqual({
        "prices.1.effectiveTimeOfDay": [
          "Two prices can't take effect at the same time.",
        ],
      });
    });

    it("asks for the time when only a date is entered", () => {
      expect(priceRows("", "2026-07-01")).toEqual({
        "prices.1.effectiveTimeOfDay": ["Enter a time, or clear the date."],
      });
    });

    it("asks for the date when only a time is entered", () => {
      expect(
        withValues((v) => {
          setPrices(v, "");
          v.prices[0].effectiveTimeOfDay = "09:00";
        }),
      ).toEqual({
        "prices.0.effectiveDate": ["Enter a date, or clear the time."],
      });
    });

    it("still checks price times while another field is empty", () => {
      const result = withValues((v) => {
        v.name = "";
        setPrices(v, "2026-07-01T09:00", "2026-07-01T09:00");
      });
      expect(Object.keys(result).sort()).toEqual([
        "name",
        "prices.1.effectiveTimeOfDay",
      ]);
    });
  });
});
