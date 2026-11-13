import { describe, expect, it } from "vitest";
import { ErrorCodeCourse } from "@/common/errors/error-codes.js";
import { ParseGuidPipe } from "@/common/validation/parse-guid.pipe.js";

describe("ParseGuidPipe", () => {
  const pipe = new ParseGuidPipe(ErrorCodeCourse.INVALID_COURSE_ID, "course");

  describe("accepted ids", () => {
    it.each([
      ["a lowercase uuid", "3f2b8c1e-5d4a-4b7e-9c10-0a1b2c3d4e5f"],
      ["an uppercase hex id", "3F2B8C1E-5D4A-4B7E-9C10-0A1B2C3D4E5F"],
      [
        "the all-zero id, which is not a valid UUID version",
        "00000000-0000-0000-0000-000000000000",
      ],
      ["a version 1 id", "6ba7b810-9dad-11d1-80b4-00c04fd430c8"],
    ])("returns %s unchanged", (_description, courseId) => {
      expect(pipe.transform(courseId)).toBe(courseId);
    });
  });

  describe("rejected ids", () => {
    it.each([
      ["an empty string", "", "'' is not a valid course identifier."],
      [
        "an id that is too short",
        "3f2b8c1e-5d4a-4b7e-9c10-0a1b2c3d4e5",
        "'3f2b8c1e-5d4a-4b7e-9c10-0a1b2c3d4e5' is not a valid course identifier.",
      ],
      [
        "an id that is too long",
        "3f2b8c1e-5d4a-4b7e-9c10-0a1b2c3d4e5f0",
        "'3f2b8c1e-5d4a-4b7e-9c10-0a1b2c3d4e5f0' is not a valid course identifier.",
      ],
      [
        "an id with non-hex characters",
        "3f2b8c1e-5d4a-4b7e-9c10-0a1b2c3d4e5g",
        "'3f2b8c1e-5d4a-4b7e-9c10-0a1b2c3d4e5g' is not a valid course identifier.",
      ],
      [
        "an id without dashes",
        "3f2b8c1e5d4a4b7e9c100a1b2c3d4e5f",
        "'3f2b8c1e5d4a4b7e9c100a1b2c3d4e5f' is not a valid course identifier.",
      ],
      [
        "an id with a leading space",
        " 3f2b8c1e-5d4a-4b7e-9c10-0a1b2c3d4e5f",
        "' 3f2b8c1e-5d4a-4b7e-9c10-0a1b2c3d4e5f' is not a valid course identifier.",
      ],
      [
        "an id with a trailing newline",
        "3f2b8c1e-5d4a-4b7e-9c10-0a1b2c3d4e5f\n",
        "'3f2b8c1e-5d4a-4b7e-9c10-0a1b2c3d4e5f\n' is not a valid course identifier.",
      ],
      [
        "an id in braces",
        "{3f2b8c1e-5d4a-4b7e-9c10-0a1b2c3d4e5f}",
        "'{3f2b8c1e-5d4a-4b7e-9c10-0a1b2c3d4e5f}' is not a valid course identifier.",
      ],
    ])(
      "throws INVALID_COURSE_ID naming the value for %s",
      (_description, courseId, expectedDetail) => {
        expect(() => pipe.transform(courseId)).toThrow(
          expect.objectContaining({
            code: ErrorCodeCourse.INVALID_COURSE_ID,
            detail: expectedDetail,
          }),
        );
      },
    );
  });

  it("puts the noun it was constructed with in the message", () => {
    const customerPipe = new ParseGuidPipe(
      ErrorCodeCourse.INVALID_COURSE_ID,
      "customer",
    );

    expect(() => customerPipe.transform("nope")).toThrow(
      expect.objectContaining({
        code: ErrorCodeCourse.INVALID_COURSE_ID,
        detail: "'nope' is not a valid customer identifier.",
      }),
    );
  });
});
