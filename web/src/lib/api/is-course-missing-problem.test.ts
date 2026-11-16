import { describe, expect, it } from "vitest";

import { isCourseMissingProblem } from "./is-course-missing-problem";

function problemWithCode(code: string) {
  return { title: "Problem", detail: "Something went wrong.", code };
}

describe("isCourseMissingProblem", () => {
  it.each(["COURSE_NOT_FOUND", "INVALID_COURSE_ID"])(
    "returns true for %s",
    (code) => {
      expect(isCourseMissingProblem(problemWithCode(code))).toBe(true);
    },
  );

  it.each(["INTERNAL_ERROR", "COURSE_IMAGE_NOT_FOUND", "SOMETHING_ELSE"])(
    "returns false for %s",
    (code) => {
      expect(isCourseMissingProblem(problemWithCode(code))).toBe(false);
    },
  );
});
