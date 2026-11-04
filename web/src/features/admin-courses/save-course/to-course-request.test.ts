import { describe, expect, it } from "vitest";

import { FROZEN_NOW } from "@/test/frozen-now";

import type { CheckedCourseFormValues } from "../validation/course-form-schema";
import { toCourseRequest } from "./to-course-request";

// A price with no set time starts one minute from now.
const ONE_MINUTE_FROM_NOW = new Date(FROZEN_NOW + 60 * 1000).toISOString();

function values(
  overrides: Partial<CheckedCourseFormValues> = {},
): CheckedCourseFormValues {
  return {
    name: "React Fundamentals",
    summary: "Learn React.",
    description: {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Hello" }] },
        { type: "paragraph" },
      ],
    },
    contentUrl: "https://example.com/course",
    schedule: {
      startDate: "2027-07-15",
      startTimeOfDay: "09:00",
      endDate: "2027-07-15",
      endTimeOfDay: "17:00",
      timeZone: "America/New_York",
    },
    prices: [
      { amountDollars: "79.50", effectiveDate: "", effectiveTimeOfDay: "" },
    ],
    ...overrides,
  };
}

describe("toCourseRequest", () => {
  it("builds exactly the contract's fields", () => {
    expect(toCourseRequest(values(), "drafted")).toEqual({
      name: "React Fundamentals",
      summary: "Learn React.",
      description: {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "Hello" }] },
        ],
      },
      contentUrl: "https://example.com/course",
      status: "drafted",
      schedule: {
        startTime: "2027-07-15T13:00:00Z",
        endTime: "2027-07-15T21:00:00Z",
        timeZone: "America/New_York",
      },
      prices: [
        {
          amount: 7950,
          currency: "USD",
          effectiveAt: ONE_MINUTE_FROM_NOW,
        },
      ],
    });
  });

  it("passes the status through", () => {
    expect(toCourseRequest(values(), "archived").status).toBe("archived");
  });

  it.each([
    ["79.50", 7950],
    ["79,50", 7950],
    ["0", 0],
    ["1.10", 110],
    ["5", 500],
    ["0.50", 50],
  ])("turns $%s into %i cents", (dollars, cents) => {
    const request = toCourseRequest(
      values({
        prices: [
          { amountDollars: dollars, effectiveDate: "", effectiveTimeOfDay: "" },
        ],
      }),
      "drafted",
    );
    expect(request.prices[0].amount).toBe(cents);
  });

  it("converts a set price time in the chosen zone and keeps the row order", () => {
    const request = toCourseRequest(
      values({
        prices: [
          {
            amountDollars: "99",
            effectiveDate: "2026-12-01",
            effectiveTimeOfDay: "10:00",
          },
          { amountDollars: "79", effectiveDate: "", effectiveTimeOfDay: "" },
        ],
      }),
      "drafted",
    );
    expect(request.prices.map((p) => p.effectiveAt)).toEqual([
      "2026-12-01T15:00:00Z",
      ONE_MINUTE_FROM_NOW,
    ]);
  });

  it("converts in a zone east of UTC", () => {
    const request = toCourseRequest(
      values({
        schedule: { ...values().schedule, timeZone: "Asia/Tokyo" },
      }),
      "drafted",
    );
    expect(request.schedule.startTime).toBe("2027-07-15T00:00:00Z");
  });

  it("throws on a time the schema should have refused", () => {
    expect(() =>
      toCourseRequest(
        values({
          schedule: {
            ...values().schedule,
            startDate: "2027-03-14",
            startTimeOfDay: "02:30",
          },
        }),
        "drafted",
      ),
    ).toThrow(/daylight-saving/);
  });
});
