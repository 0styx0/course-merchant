import { describe, expect, it } from "vitest";

import { courseFormProblems } from "./course-form-problems";

const fields = [
  ["title", "Title"],
  ["group.first", "First"],
  ["group.second", "Second"],
] as const;

describe("courseFormProblems", () => {
  it("is empty without errors", () => {
    expect(courseFormProblems({}, fields)).toEqual([]);
  });

  it("lists problems in the order of the given fields with their labels", () => {
    const problems = courseFormProblems(
      {
        group: { second: { type: "custom", message: "Bad second." } },
        title: { type: "custom", message: "Bad title." },
      },
      fields,
    );

    expect(problems).toEqual([
      { fieldName: "title", label: "Title", message: "Bad title." },
      { fieldName: "group.second", label: "Second", message: "Bad second." },
    ]);
  });

  it("finds a nested field's error", () => {
    const problems = courseFormProblems(
      { group: { first: { type: "custom", message: "Bad first." } } },
      fields,
    );

    expect(problems.map((problem) => problem.fieldName)).toEqual([
      "group.first",
    ]);
  });

  it("ignores an error on a field that is not in the list", () => {
    expect(
      courseFormProblems(
        { other: { type: "custom", message: "Unlisted." } },
        fields,
      ),
    ).toEqual([]);
  });

  it("skips a listed field whose error has no message", () => {
    expect(courseFormProblems({ title: { type: "custom" } }, fields)).toEqual(
      [],
    );
  });
});
