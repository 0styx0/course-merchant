import { describe, expect, it } from "vitest";

import { editCoursePath } from "./edit-course-path";

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
