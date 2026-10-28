import { describe, expect, it } from "vitest";

import { courseFormProblems } from "./course-form-problems";

describe("courseFormProblems", () => {
  it("is empty without errors", () => {
    expect(courseFormProblems({})).toEqual([]);
  });

  it("lists problems in page order with their labels", () => {
    const problems = courseFormProblems({
      schedule: { endTimeOfDay: { type: "custom", message: "Too early." } },
      name: { type: "custom", message: "Enter a course name." },
    });

    expect(problems).toEqual([
      {
        fieldName: "name",
        label: "Course name",
        message: "Enter a course name.",
      },
      {
        fieldName: "schedule.endTimeOfDay",
        label: "End time",
        message: "Too early.",
      },
    ]);
  });

  it("finds a price row's field", () => {
    expect(
      courseFormProblems({
        prices: [
          { amountDollars: { type: "custom", message: "Enter a price." } },
        ],
      }),
    ).toEqual([
      {
        fieldName: "prices.0.amountDollars",
        label: "Price",
        message: "Enter a price.",
      },
    ]);
  });
});
