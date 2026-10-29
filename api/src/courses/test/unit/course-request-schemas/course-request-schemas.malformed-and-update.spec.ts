import { describe, expect, it } from "vitest";
import {
  createCourseRequestSchema,
  updateCourseRequestSchema,
} from "@/courses/validation/course-request-schemas.js";
import {
  utcIn,
  makeValidRequest,
  makePrice,
  expectIssueAt,
  expectUnknownKeyIssue,
} from "@/courses/test/unit/course-request-schemas/course-request-schemas.fixtures.js";

describe("createCourseRequestSchema", () => {
  describe("malformed input", () => {
    const malformedInputs: Array<{
      label: string;
      makeInput: () => unknown;
    }> = [
      {
        label: "a null schedule",
        makeInput: () => ({
          ...makeValidRequest(),
          schedule: null,
        }),
      },
      {
        label: "a numeric start time",
        makeInput: () => {
          const request = makeValidRequest();

          return {
            ...request,
            schedule: {
              ...request.schedule,
              startTime: 123,
            },
          };
        },
      },
      {
        label: "a malformed start-time string",
        makeInput: () => {
          const request = makeValidRequest();

          return {
            ...request,
            schedule: {
              ...request.schedule,
              startTime: "not-a-date",
            },
          };
        },
      },
      {
        label: "a null prices property",
        makeInput: () => ({
          ...makeValidRequest(),
          prices: null,
        }),
      },
      {
        label: "a null price entry",
        makeInput: () => ({
          ...makeValidRequest(),
          prices: [null],
        }),
      },
      {
        label: "a price with no effectiveAt",
        makeInput: () => ({
          ...makeValidRequest(),
          prices: [
            {
              amount: 5000,
              currency: "USD",
            },
          ],
        }),
      },
    ];

    it.each(malformedInputs)(
      "returns a validation failure rather than throwing for $label",
      ({ makeInput }) => {
        const input = makeInput();
        let result:
          ReturnType<typeof createCourseRequestSchema.safeParse> | undefined;

        expect(() => {
          result = createCourseRequestSchema.safeParse(input);
        }).not.toThrow();

        if (!result) {
          throw new Error("Validation did not return a result.");
        }

        expect(result.success).toBe(false);
      },
    );
  });
});

describe("updateCourseRequestSchema", () => {
  function getUpdateIssues(input: unknown) {
    const result = updateCourseRequestSchema.safeParse(input);

    expect(result.success).toBe(false);

    if (result.success) {
      throw new Error("Expected request validation to fail.");
    }

    return result.error.issues;
  }

  it("accepts a complete valid request", () => {
    const result = updateCourseRequestSchema.safeParse(makeValidRequest());

    expect(result.success).toBe(true);
  });

  it("leaves past schedule times and prices to the service", () => {
    const request = makeValidRequest();

    request.schedule.startTime = utcIn(-3);
    request.schedule.endTime = utcIn(-2);
    request.prices = [makePrice(utcIn(-1))];

    const result = updateCourseRequestSchema.safeParse(request);

    expect(result.success).toBe(true);
  });

  it("accepts an empty price list", () => {
    const result = updateCourseRequestSchema.safeParse({
      ...makeValidRequest(),
      prices: [],
    });

    expect(result.success).toBe(true);
  });

  it("accepts the deleted status", () => {
    const result = updateCourseRequestSchema.safeParse({
      ...makeValidRequest(),
      status: "deleted",
    });

    expect(result.success).toBe(true);
  });

  it("rejects an end time that is not after the start time", () => {
    const request = makeValidRequest();

    request.schedule.endTime = request.schedule.startTime;

    expectIssueAt(
      getUpdateIssues(request),
      ["schedule", "endTime"],
      "End time must be after start time.",
    );
  });

  it("rejects duplicate effective times within the request", () => {
    const effectiveAt = utcIn(2);

    expectIssueAt(
      getUpdateIssues({
        ...makeValidRequest(),
        prices: [makePrice(effectiveAt), makePrice(effectiveAt)],
      }),
      ["prices", 1, "effectiveAt"],
      "Price effective times must be unique.",
    );
  });

  it("rejects a price id", () => {
    const request = makeValidRequest();

    expectUnknownKeyIssue(
      getUpdateIssues({
        ...request,
        prices: [{ ...request.prices[0], id: crypto.randomUUID() }],
      }),
      ["prices", 0],
    );
  });

  it("rejects read-only course fields", () => {
    expectUnknownKeyIssue(
      getUpdateIssues({
        ...makeValidRequest(),
        id: crypto.randomUUID(),
        enrollments: [],
      }),
      [],
    );
  });
});
