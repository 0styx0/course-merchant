import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { type CourseFormValues } from "../course-form-schema";
import { NOW, withValues } from "./course-form-schema.fixtures";

describe("courseFormSchema", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => vi.useRealTimers());

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
