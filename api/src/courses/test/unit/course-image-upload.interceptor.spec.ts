import { MulterError } from "multer";
import { describe, expect, it } from "vitest";

import { toUploadException } from "@/courses/course-image-upload.interceptor.js";

describe("toUploadException", () => {
  it("maps a too-large file to ABOVE_MAXIMUM on /image", () => {
    const exception = toUploadException(new MulterError("LIMIT_FILE_SIZE"));

    expect(exception.errors).toMatchObject([
      { field: "/image", code: "ABOVE_MAXIMUM" },
    ]);
  });

  it.each([
    "LIMIT_UNEXPECTED_FILE",
    "LIMIT_PART_COUNT",
    "LIMIT_FILE_COUNT",
  ] as const)("maps %s to UNKNOWN_FIELD on /image", (code) => {
    const exception = toUploadException(new MulterError(code, "other"));

    expect(exception.errors).toMatchObject([
      { field: "/image", code: "UNKNOWN_FIELD" },
    ]);
  });

  it("maps any other error to INVALID_FORMAT on /image", () => {
    const exception = toUploadException(new Error("Unexpected end of form"));

    expect(exception.errors).toMatchObject([
      { field: "/image", code: "INVALID_FORMAT" },
    ]);
  });
});
