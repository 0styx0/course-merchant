import { describe, expect, it } from "vitest";
import { z } from "zod";

import { descriptionDoc } from "@/test/course-fixtures.js";

import {
  courseCurrencySchema,
  courseDetailsShape,
  coursePriceAmountSchema,
  courseScheduleFieldsSchema,
  scheduledPriceFieldsSchema,
} from "@/courses/validation/course-field-schemas.js";

describe("courseCurrencySchema", () => {
  it("accepts USD", () => {
    expect(courseCurrencySchema.safeParse("USD").success).toBe(true);
  });

  it.each(["usd", "Usd", "US", "USDD", "U$D", "", "ZZZ"])(
    "rejects %s",
    (currency) => {
      expect(courseCurrencySchema.safeParse(currency).success).toBe(false);
    },
  );

  it("rejects a real currency the store doesn't accept", () => {
    const result = courseCurrencySchema.safeParse("EUR");

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(
      "Must be one of the accepted currencies: USD.",
    );
  });

  it.each([
    { label: "a number", value: 123 },
    { label: "null", value: null },
    { label: "undefined", value: undefined },
  ])("rejects $label", ({ value }) => {
    expect(courseCurrencySchema.safeParse(value).success).toBe(false);
  });
});

describe("coursePriceAmountSchema", () => {
  it.each([0, 50, 51, 100, Number.MAX_SAFE_INTEGER])("accepts %s", (amount) => {
    expect(coursePriceAmountSchema.safeParse(amount).success).toBe(true);
  });

  it.each([
    -1,
    1,
    49,
    50.5,
    1.5,
    Number.MAX_SAFE_INTEGER + 1,
    Number.MIN_SAFE_INTEGER - 1,
    NaN,
    Infinity,
    -Infinity,
  ])("rejects %s", (amount) => {
    expect(coursePriceAmountSchema.safeParse(amount).success).toBe(false);
  });

  it.each([
    { label: "a numeric string", value: "50" },
    { label: "null", value: null },
    { label: "undefined", value: undefined },
    { label: "a boolean", value: true },
  ])("rejects $label", ({ value }) => {
    expect(coursePriceAmountSchema.safeParse(value).success).toBe(false);
  });
});

describe("courseScheduleFieldsSchema", () => {
  const validSchedule = {
    startTime: "2026-12-01T09:00:00Z",
    endTime: "2026-12-01T10:00:00Z",
    timeZone: "America/Denver",
  };

  it("accepts a complete valid schedule", () => {
    expect(courseScheduleFieldsSchema.safeParse(validSchedule).success).toBe(
      true,
    );
  });

  it.each(["startTime", "endTime", "timeZone"] as const)(
    "requires %s",
    (field) => {
      const input: Record<string, unknown> = { ...validSchedule };
      delete input[field];

      const result = courseScheduleFieldsSchema.safeParse(input);

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(
          result.error.issues.some(
            (issue) => issue.path.length === 1 && issue.path[0] === field,
          ),
        ).toBe(true);
      }
    },
  );

  it.each([
    {
      field: "startTime",
      value: "not-a-date",
    },
    {
      field: "endTime",
      value: "not-a-date",
    },
    {
      field: "timeZone",
      value: "Not/AZone",
    },
  ])("rejects an invalid $field", ({ field, value }) => {
    const result = courseScheduleFieldsSchema.safeParse({
      ...validSchedule,
      [field]: value,
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(
        result.error.issues.some(
          (issue) => issue.path.length === 1 && issue.path[0] === field,
        ),
      ).toBe(true);
    }
  });
});

describe("scheduledPriceFieldsSchema", () => {
  const validPrice = {
    amount: 50,
    currency: "USD",
    effectiveAt: "2026-12-01T09:00:00Z",
  };

  it("accepts a valid price", () => {
    expect(scheduledPriceFieldsSchema.safeParse(validPrice).success).toBe(true);
  });

  it("accepts a zero-priced entry", () => {
    expect(
      scheduledPriceFieldsSchema.safeParse({
        ...validPrice,
        amount: 0,
      }).success,
    ).toBe(true);
  });

  it.each(["amount", "currency", "effectiveAt"] as const)(
    "requires %s",
    (field) => {
      const input: Record<string, unknown> = { ...validPrice };
      delete input[field];

      const result = scheduledPriceFieldsSchema.safeParse(input);

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(
          result.error.issues.some(
            (issue) => issue.path.length === 1 && issue.path[0] === field,
          ),
        ).toBe(true);
      }
    },
  );

  it.each([
    {
      field: "amount",
      value: 49,
    },
    {
      field: "currency",
      value: "ZZZ",
    },
    {
      field: "effectiveAt",
      value: "not-a-date",
    },
  ])("rejects an invalid $field", ({ field, value }) => {
    const result = scheduledPriceFieldsSchema.safeParse({
      ...validPrice,
      [field]: value,
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(
        result.error.issues.some(
          (issue) => issue.path.length === 1 && issue.path[0] === field,
        ),
      ).toBe(true);
    }
  });
});

describe("courseDetailsShape", () => {
  const courseDetailsSchema = z.object(courseDetailsShape);

  it("accepts valid course details", () => {
    expect(
      courseDetailsSchema.safeParse({
        name: "TypeScript Fundamentals",
        summary: "Learn TypeScript fast.",
        description: descriptionDoc("Learn TypeScript from the ground up."),
      }).success,
    ).toBe(true);
  });

  it("rejects invalid course details", () => {
    const result = courseDetailsSchema.safeParse({
      name: "",
      description: 123,
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path)).toEqual(
        expect.arrayContaining([["name"], ["description"]]),
      );
    }
  });
});
