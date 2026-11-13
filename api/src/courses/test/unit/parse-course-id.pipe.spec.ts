import { describe, expect, it } from "vitest";
import { ErrorCodeCourse } from "@/common/errors/error-codes.js";
import { ParseCourseIdPipe } from "@/courses/pipes/parse-course-id.pipe.js";

describe("ParseCourseIdPipe", () => {
  const pipe = new ParseCourseIdPipe();

  describe("accepted ids", () => {
    it.each([
      ["a lowercase uuid", "3f2b8c1e-5d4a-4b7e-9c10-0a1b2c3d4e5f"],
      ["an uppercase hex id", "3F2B8C1E-5D4A-4B7E-9C10-0A1B2C3D4E5F"],
      ["the all-zero id", "00000000-0000-0000-0000-000000000000"],
      ["a version 1 id", "6ba7b810-9dad-11d1-80b4-00c04fd430c8"],
    ])("returns %s unchanged", (_description, courseId) => {
      expect(pipe.transform(courseId)).toBe(courseId);
    });
  });

  describe("rejected ids", () => {
    it.each([
      ["an empty string", ""],
      ["an id that is too short", "3f2b8c1e-5d4a-4b7e-9c10-0a1b2c3d4e5"],
      ["an id that is too long", "3f2b8c1e-5d4a-4b7e-9c10-0a1b2c3d4e5f0"],
      ["an id with non-hex characters", "3f2b8c1e-5d4a-4b7e-9c10-0a1b2c3d4e5g"],
      ["an id without dashes", "3f2b8c1e5d4a4b7e9c100a1b2c3d4e5f"],
      ["an id with a leading space", " 3f2b8c1e-5d4a-4b7e-9c10-0a1b2c3d4e5f"],
      [
        "an id with a trailing newline",
        "3f2b8c1e-5d4a-4b7e-9c10-0a1b2c3d4e5f\n",
      ],
      ["an id in braces", "{3f2b8c1e-5d4a-4b7e-9c10-0a1b2c3d4e5f}"],
    ])(
      "throws INVALID_COURSE_ID naming the value for %s",
      (_description, courseId) => {
        expect(() => pipe.transform(courseId)).toThrow(
          expect.objectContaining({
            code: ErrorCodeCourse.INVALID_COURSE_ID,
            detail: `'${courseId}' is not a valid course identifier.`,
          }),
        );
      },
    );
  });
});
