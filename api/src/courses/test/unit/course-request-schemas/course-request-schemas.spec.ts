import { describe, expect, it } from "vitest";
import { createCourseRequestSchema } from "@/courses/validation/course-request-schemas.js";
import {
  utcIn,
  makeValidRequest,
  makePrice,
  getIssues,
  expectIssueAt,
  expectUnknownKeyIssue,
} from "@/courses/test/unit/course-request-schemas/course-request-schemas.fixtures.js";

describe("createCourseRequestSchema", () => {
  describe("valid requests", () => {
    it("accepts a complete valid request", () => {
      const result = createCourseRequestSchema.safeParse(makeValidRequest());

      expect(result.success).toBe(true);
    });

    it("returns the trimmed name", () => {
      const request = makeValidRequest();

      request.name = "  TypeScript Fundamentals  ";

      const result = createCourseRequestSchema.safeParse(request);

      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.name).toBe("TypeScript Fundamentals");
      }
    });

    it("accepts a zero-priced course", () => {
      const request = makeValidRequest();
      request.prices[0].amount = 0;

      expect(createCourseRequestSchema.safeParse(request).success).toBe(true);
    });

    it("accepts multiple prices with distinct effective times", () => {
      const request = makeValidRequest();

      request.prices = [
        makePrice(utcIn(2)),
        makePrice(utcIn(3)),
        makePrice(utcIn(4)),
      ];

      expect(createCourseRequestSchema.safeParse(request).success).toBe(true);
    });

    it("accepts canonical UTC timestamps ending in Z", () => {
      const request = makeValidRequest();

      request.schedule.startTime = "2030-01-01T18:00:00Z";
      request.schedule.endTime = "2030-01-01T19:00:00Z";
      request.prices[0].effectiveAt = "2030-01-01T17:00:00Z";

      expect(createCourseRequestSchema.safeParse(request).success).toBe(true);
    });

    it("accepts canonical UTC timestamps with fractional seconds", () => {
      const request = makeValidRequest();

      request.schedule.startTime = "2030-01-01T18:00:00.123Z";
      request.schedule.endTime = "2030-01-01T19:00:00.456Z";
      request.prices[0].effectiveAt = "2030-01-01T17:00:00.789Z";

      expect(createCourseRequestSchema.safeParse(request).success).toBe(true);
    });
  });

  describe("required fields", () => {
    it.each([
      "name",
      "summary",
      "description",
      "contentUrl",
      "status",
      "schedule",
      "prices",
    ] as const)("requires %s", (field) => {
      const request: Record<string, unknown> = {
        ...makeValidRequest(),
      };

      delete request[field];

      const issues = getIssues(request);

      expectIssueAt(issues, [field]);
    });

    it.each([
      ["name", null],
      ["summary", null],
      ["description", null],
      ["contentUrl", null],
      ["status", null],
      ["schedule", null],
      ["prices", null],
    ] as const)("rejects null for %s", (field, value) => {
      const request = {
        ...makeValidRequest(),
        [field]: value,
      };

      const issues = getIssues(request);

      expectIssueAt(issues, [field]);
    });

    it("rejects a status that is not allowed during creation", () => {
      const request = {
        ...makeValidRequest(),
        status: "deleted",
      };

      const issues = getIssues(request);

      expectIssueAt(issues, ["status"]);
    });

    it("rejects an empty prices array", () => {
      const request = makeValidRequest();
      request.prices = [];

      const issues = getIssues(request);

      expectIssueAt(issues, ["prices"]);
    });
  });

  describe("nested object structure", () => {
    it.each(["startTime", "endTime", "timeZone"] as const)(
      "requires schedule.%s",
      (field) => {
        const schedule: Record<string, unknown> = {
          ...makeValidRequest().schedule,
        };

        delete schedule[field];

        const issues = getIssues({
          ...makeValidRequest(),
          schedule,
        });

        expectIssueAt(issues, ["schedule", field]);
      },
    );

    it.each(["amount", "currency", "effectiveAt"] as const)(
      "requires prices[0].%s",
      (field) => {
        const price: Record<string, unknown> = {
          ...makeValidRequest().prices[0],
        };

        delete price[field];

        const issues = getIssues({
          ...makeValidRequest(),
          prices: [price],
        });

        expectIssueAt(issues, ["prices", 0, field]);
      },
    );

    it("rejects an invalid schedule time", () => {
      const request = makeValidRequest();

      request.schedule.startTime = "not-a-date";

      const issues = getIssues(request);

      expectIssueAt(issues, ["schedule", "startTime"]);
    });

    it("rejects an invalid price amount", () => {
      const request = makeValidRequest();
      request.prices[0].amount = 49;

      const issues = getIssues(request);

      expectIssueAt(issues, ["prices", 0, "amount"]);
    });

    it("rejects a price entry that is not an object", () => {
      const request = {
        ...makeValidRequest(),
        prices: [null],
      };

      const issues = getIssues(request);

      expectIssueAt(issues, ["prices", 0]);
    });
  });

  describe("unknown properties", () => {
    it("rejects unknown top-level properties", () => {
      const issues = getIssues({
        ...makeValidRequest(),
        unexpectedField: true,
      });

      expectUnknownKeyIssue(issues, []);
    });

    it("rejects unknown schedule properties", () => {
      const request = makeValidRequest();

      const issues = getIssues({
        ...request,
        schedule: {
          ...request.schedule,
          unexpectedField: true,
        },
      });

      expectUnknownKeyIssue(issues, ["schedule"]);
    });

    it("rejects unknown price properties", () => {
      const request = makeValidRequest();

      const issues = getIssues({
        ...request,
        prices: [
          {
            ...request.prices[0],
            unexpectedField: true,
          },
        ],
      });

      expectUnknownKeyIssue(issues, ["prices", 0]);
    });
  });
});
