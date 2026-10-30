import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { action, renderForm, summaryWithHeading } from "./course-form.fixtures";

vi.mock(
  "next/navigation",
  async () => (await import("./course-form.mocks")).navigationMock,
);
vi.mock("../../save-course/create-course.action", () => ({
  createCourseAction: vi.fn(),
}));
vi.mock("../../save-course/update-course.action", () => ({
  updateCourseAction: vi.fn(),
}));
vi.mock("../../save-course/upload-image/upload-course-image.action", () => ({
  uploadCourseImageAction: vi.fn(),
}));
vi.mock("../../description-editor/description-editor", async () => ({
  DescriptionEditor: (await import("./course-form.mocks"))
    .MockDescriptionEditor,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("CourseForm", () => {
  it("lists every problem and focuses the list when submitted invalid", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole("button", { name: "Save as draft" }));

    await screen.findByRole("heading", { name: /^Fix \d+ problems/ });
    const summary = summaryWithHeading(/^Fix \d+ problems/);
    expect(summary).toHaveFocus();
    expect(summary).toHaveTextContent("Enter a course name.");
    expect(summary).toHaveTextContent("Enter a description.");
    expect(summary).toHaveTextContent("Enter a price, like 79.50.");
    expect(action).not.toHaveBeenCalled();
  });

  it("focuses a field from its link in the list", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole("button", { name: "Save as draft" }));

    await user.click(await screen.findByRole("button", { name: "Summary" }));

    expect(screen.getByLabelText("Summary")).toHaveFocus();
  });
});
