import { describe, expect, it } from "vitest";

import { adminCourseImagePath } from "./course-image-route";

describe("adminCourseImagePath", () => {
  it("carries the stored image's version, so a new image gets a new address", () => {
    expect(adminCourseImagePath("c1", "1760605200000")).toBe(
      "/admin/courses/c1/image?v=1760605200000",
    );
  });
});
