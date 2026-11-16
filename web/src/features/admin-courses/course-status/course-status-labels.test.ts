import { describe, expect, it } from "vitest";

import { courseStatusLabels } from "./course-status-labels";

describe("courseStatusLabels", () => {
  it("gives each course status the word the admin sees", () => {
    expect(courseStatusLabels).toEqual({
      published: "Published",
      drafted: "Drafted",
      archived: "Archived",
      deleted: "Deleted",
    });
  });
});
