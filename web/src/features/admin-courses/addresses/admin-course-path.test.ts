import { describe, expect, it } from "vitest";

import {
  adminCourseImagePath,
  adminCourseViewPath,
  editCoursePath,
} from "./admin-course-path";

describe("adminCourseViewPath", () => {
  it("gives the admin course page's address", () => {
    expect(adminCourseViewPath("course-42")).toBe("/admin/courses/course-42");
  });
});

describe("editCoursePath", () => {
  it("gives the edit page's address", () => {
    expect(editCoursePath("course-42")).toBe("/admin/courses/course-42/edit");
  });

  it("adds the draft flag when the course was just saved as a draft", () => {
    expect(editCoursePath("course-42", "draft")).toBe(
      "/admin/courses/course-42/edit?saved=draft",
    );
  });
});

describe("adminCourseImagePath", () => {
  it("carries the stored image's version, so a new image gets a new address", () => {
    expect(adminCourseImagePath("c1", "1760605200000")).toBe(
      "/admin/courses/c1/image?v=1760605200000",
    );
  });
});
