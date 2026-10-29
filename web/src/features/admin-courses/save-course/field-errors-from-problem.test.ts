import { describe, expect, it } from "vitest";

import type { ValidationProblemDetails } from "@/lib/types";
import { fieldErrorsFromProblem } from "./field-errors-from-problem";

function problemWith(...fields: string[]): ValidationProblemDetails {
  return {
    title: "Validation failed",
    detail: "Invalid.",
    code: "VALIDATION_FAILED",
    errors: fields.map((field) => ({
      field,
      code: "INVALID_VALUE",
      detail: `Problem with ${field}`,
    })),
  };
}

describe("fieldErrorsFromProblem", () => {
  it.each([
    ["/name", "name"],
    ["/summary", "summary"],
    ["/contentUrl", "contentUrl"],
    ["/schedule/startTime", "schedule.startTimeOfDay"],
    ["/schedule/endTime", "schedule.endTimeOfDay"],
    ["/schedule/timeZone", "schedule.timeZone"],
    ["/prices/0/amount", "prices.0.amountDollars"],
    ["/prices/12/effectiveAt", "prices.12.effectiveTimeOfDay"],
    ["/description", "description"],
    ["/description/content/0/content/1/marks/0", "description"],
  ])("maps %s to %s", (pointer, path) => {
    expect(fieldErrorsFromProblem(problemWith(pointer))).toEqual([
      { path, message: `Problem with ${pointer}` },
    ]);
  });

  it("leaves out pointers the form has no field for", () => {
    expect(
      fieldErrorsFromProblem(
        problemWith("/status", "/prices/0/currency", "/prices", "/name/x"),
      ),
    ).toEqual([]);
  });

  it("returns nothing for a problem without errors", () => {
    expect(
      fieldErrorsFromProblem({ title: "t", detail: "d", code: "C" }),
    ).toEqual([]);
  });
});
