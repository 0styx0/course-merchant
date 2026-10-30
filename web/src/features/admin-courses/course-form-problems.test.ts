import { describe, expect, it } from "vitest";

import { courseFormProblems } from "./course-form-problems";

describe("courseFormProblems", () => {
  it("is empty without errors", () => {
    expect(courseFormProblems({}, 1)).toEqual([]);
  });

  it("lists problems in page order with their labels", () => {
    const problems = courseFormProblems(
      {
        schedule: { endTimeOfDay: { type: "custom", message: "Too early." } },
        name: { type: "custom", message: "Enter a course name." },
        image: { type: "custom", message: "Choose an image." },
      },
      1,
    );

    expect(problems).toEqual([
      {
        fieldName: "name",
        label: "Course name",
        message: "Enter a course name.",
      },
      {
        fieldName: "image",
        label: "Image",
        message: "Choose an image.",
      },
      {
        fieldName: "schedule.endTimeOfDay",
        label: "End time",
        message: "Too early.",
      },
    ]);
  });

  it("finds a price row's field, with a plain label for one row", () => {
    expect(
      courseFormProblems(
        {
          prices: [
            { amountDollars: { type: "custom", message: "Enter a price." } },
          ],
        },
        1,
      ),
    ).toEqual([
      {
        fieldName: "prices.0.amountDollars",
        label: "Price",
        message: "Enter a price.",
      },
    ]);
  });

  it("numbers price rows in page order when there are several", () => {
    expect(
      courseFormProblems(
        {
          prices: [
            undefined,
            {
              effectiveTimeOfDay: { type: "custom", message: "Too soon." },
              amountDollars: { type: "custom", message: "Enter a price." },
            },
          ],
        },
        2,
      ),
    ).toEqual([
      {
        fieldName: "prices.1.amountDollars",
        label: "Price 2",
        message: "Enter a price.",
      },
      {
        fieldName: "prices.1.effectiveTimeOfDay",
        label: "Price 2 start time",
        message: "Too soon.",
      },
    ]);
  });
});
