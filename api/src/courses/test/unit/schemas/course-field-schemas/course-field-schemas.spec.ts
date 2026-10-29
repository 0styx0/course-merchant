import { describe, expect, it } from "vitest";

import {
  courseContentUrlSchema,
  courseDateTimeSchema,
  courseEndTimeSchema,
  courseNameSchema,
  courseSummarySchema,
  coursePriceEffectiveAtSchema,
  courseStartTimeSchema,
  courseTimeZoneSchema,
  createStatusSchema,
  updateStatusSchema,
} from "@/courses/validation/course-field-schemas.js";

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
