import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  courseContentUrlSchema,
  courseCurrencySchema,
  courseDateTimeSchema,
  courseDescriptionSchema,
  courseDetailsShape,
  courseEndTimeSchema,
  courseNameSchema,
  courseSummarySchema,
  coursePriceAmountSchema,
  coursePriceEffectiveAtSchema,
  courseScheduleFieldsSchema,
  courseStartTimeSchema,
  courseTimeZoneSchema,
  createStatusSchema,
  scheduledPriceFieldsSchema,
  updateStatusSchema,
} from "./course-field-schemas.js";

describe("courseNameSchema", () => {
  it("accepts a valid name", () => {
    expect(courseNameSchema.safeParse("TypeScript Fundamentals").success).toBe(
      true,
    );
  });

  it("accepts a one-character name", () => {
    expect(courseNameSchema.safeParse("A").success).toBe(true);
  });

  it("accepts a name at the maximum length", () => {
    expect(courseNameSchema.safeParse("a".repeat(100)).success).toBe(true);
  });

  it("rejects an empty name", () => {
    expect(courseNameSchema.safeParse("").success).toBe(false);
  });

  it("rejects a name exceeding the maximum length", () => {
    expect(courseNameSchema.safeParse("a".repeat(101)).success).toBe(false);
  });

  it.each(["", " ", "   ", "\t", "\n", " \t\n "])(
    "rejects whitespace-only input: %j",
    (value) => {
      expect(courseNameSchema.safeParse(value).success).toBe(false);
    },
  );

  it("trims leading and trailing whitespace", () => {
    const result = courseNameSchema.safeParse("  TypeScript Fundamentals  ");

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data).toBe("TypeScript Fundamentals");
    }
  });

  it.each([
    { label: "a number", value: 123 },
    { label: "null", value: null },
    { label: "undefined", value: undefined },
    { label: "a boolean", value: true },
    { label: "an object", value: {} },
  ])("rejects $label", ({ value }) => {
    expect(courseNameSchema.safeParse(value).success).toBe(false);
  });
});

describe("courseSummarySchema", () => {
  it("accepts a valid summary", () => {
    expect(
      courseSummarySchema.safeParse(
        "Learn TypeScript fast. Build three small projects.",
      ).success,
    ).toBe(true);
  });

  it("accepts a summary at the maximum length", () => {
    expect(courseSummarySchema.safeParse("a".repeat(300)).success).toBe(true);
  });

  it("rejects a summary exceeding the maximum length", () => {
    expect(courseSummarySchema.safeParse("a".repeat(301)).success).toBe(false);
  });

  it.each(["", " ", "   ", "\t", "\n", " \t\n "])(
    "rejects empty or whitespace-only input: %j",
    (value) => {
      expect(courseSummarySchema.safeParse(value).success).toBe(false);
    },
  );

  it("trims leading and trailing whitespace", () => {
    const result = courseSummarySchema.safeParse("  A short summary.  ");

    expect(result.success && result.data).toBe("A short summary.");
  });

  it.each([123, null, undefined, false])("rejects %j", (value) => {
    expect(courseSummarySchema.safeParse(value).success).toBe(false);
  });
});

describe("courseDescriptionSchema", () => {
  it("accepts a valid description", () => {
    expect(
      courseDescriptionSchema.safeParse("Learn TypeScript from the ground up.")
        .success,
    ).toBe(true);
  });

  it("accepts a one-character description", () => {
    expect(courseDescriptionSchema.safeParse("A").success).toBe(true);
  });

  it("accepts a description at the maximum length", () => {
    expect(courseDescriptionSchema.safeParse("a".repeat(5000)).success).toBe(
      true,
    );
  });

  it("rejects an empty description", () => {
    expect(courseDescriptionSchema.safeParse("").success).toBe(false);
  });

  it("rejects a description exceeding the maximum length", () => {
    expect(courseDescriptionSchema.safeParse("a".repeat(5001)).success).toBe(
      false,
    );
  });

  it.each(["", " ", "   ", "\t", "\n", " \t\n "])(
    "rejects whitespace-only input: %j",
    (value) => {
      expect(courseDescriptionSchema.safeParse(value).success).toBe(false);
    },
  );

  it("trims leading and trailing whitespace", () => {
    const result = courseDescriptionSchema.safeParse(
      "  TypeScript Fundamentals  ",
    );

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data).toBe("TypeScript Fundamentals");
    }
  });

  it.each([
    { label: "a number", value: 123 },
    { label: "null", value: null },
    { label: "undefined", value: undefined },
    { label: "a boolean", value: false },
  ])("rejects $label", ({ value }) => {
    expect(courseDescriptionSchema.safeParse(value).success).toBe(false);
  });
});

describe("createStatusSchema", () => {
  it.each(["archived", "drafted"] as const)("accepts %s", (status) => {
    expect(createStatusSchema.safeParse(status).success).toBe(true);
  });

  it.each([
    "published",
    "deleted",
    "Published",
    "unknown",
    "",
    null,
    undefined,
    123,
  ])("rejects %s", (status) => {
    expect(createStatusSchema.safeParse(status).success).toBe(false);
  });
});

describe("updateStatusSchema", () => {
  it.each(["published", "archived", "drafted", "deleted"] as const)(
    "accepts %s",
    (status) => {
      expect(updateStatusSchema.safeParse(status).success).toBe(true);
    },
  );

  it.each(["Published", "unknown", "", null, undefined, 123])(
    "rejects %s",
    (status) => {
      expect(updateStatusSchema.safeParse(status).success).toBe(false);
    },
  );
});

describe("courseDateTimeSchema", () => {
  it.each([
    "2026-01-15T12:30:00Z",
    "2026-01-15T12:30:00.123Z",
    "2026-01-15T12:30:00.123456Z",
  ])("accepts %s", (dateTime) => {
    expect(courseDateTimeSchema.safeParse(dateTime).success).toBe(true);
  });

  it.each([
    "2026-01-15",
    "2026-01-15T12:30:00",
    "not-a-date",
    "",
    "2026-01-15T12:30:00+25:00",
    "2026-01-15T12:30:00+02:00",
    "2026-01-15T12:30:00-07:00",
  ])("rejects %s", (dateTime) => {
    expect(courseDateTimeSchema.safeParse(dateTime).success).toBe(false);
  });

  it.each([
    { label: "a number", value: 123 },
    { label: "null", value: null },
    { label: "undefined", value: undefined },
  ])("rejects $label", ({ value }) => {
    expect(courseDateTimeSchema.safeParse(value).success).toBe(false);
  });

  it("uses the shared date-time rules for start, end, and price effective times", () => {
    const validDateTime = "2026-01-15T12:30:00Z";
    const invalidDateTime = "2026-01-15T12:30:00";

    for (const schema of [
      courseStartTimeSchema,
      courseEndTimeSchema,
      coursePriceEffectiveAtSchema,
    ]) {
      expect(schema.safeParse(validDateTime).success).toBe(true);
      expect(schema.safeParse(invalidDateTime).success).toBe(false);
    }
  });
});

describe("courseTimeZoneSchema", () => {
  it.each(["UTC", "America/Denver", "Europe/Paris", "Asia/Tokyo"])(
    "accepts %s",
    (timeZone) => {
      expect(courseTimeZoneSchema.safeParse(timeZone).success).toBe(true);
    },
  );

  it.each(["Not/AZone", "", "-07:00", "+05", "+0500", "+05:00"])(
    "rejects %s",
    (timeZone) => {
      expect(courseTimeZoneSchema.safeParse(timeZone).success).toBe(false);
    },
  );

  it.each([
    { label: "a number", value: 123 },
    { label: "null", value: null },
    { label: "undefined", value: undefined },
  ])("rejects $label", ({ value }) => {
    expect(courseTimeZoneSchema.safeParse(value).success).toBe(false);
  });
});

describe("courseContentUrlSchema", () => {
  it.each([
    "https://drive.google.com/drive/folders/1a2b3c",
    "http://zoom.us/j/123456789",
  ])("accepts %s", (url) => {
    expect(courseContentUrlSchema.safeParse(url).success).toBe(true);
  });

  it.each([
    "ftp://files.example.com/course",
    "javascript:alert(1)",
    "drive.google.com/folder",
    "",
    `https://example.com/${"a".repeat(2048)}`,
  ])("rejects %s", (url) => {
    expect(courseContentUrlSchema.safeParse(url).success).toBe(false);
  });
});

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
        description: "Learn TypeScript from the ground up.",
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
