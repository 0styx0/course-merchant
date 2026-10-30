import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderForm } from "./course-form.fixtures";

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
  it("adds and removes price rows, numbering them only when there are several", async () => {
    const user = userEvent.setup();
    renderForm();
    expect(
      screen.queryByRole("button", { name: /Remove price/ }),
    ).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("Price"), "10");
    await user.click(screen.getByRole("button", { name: "Add price" }));

    expect(screen.getByLabelText("Price 1")).toHaveValue("10");
    expect(screen.getByLabelText("Price 2")).toHaveValue("");
    expect(screen.getByLabelText("Price 2 start date")).toHaveValue("");

    await user.type(screen.getByLabelText("Price 2"), "20");
    await user.click(screen.getByRole("button", { name: "Remove price 1" }));

    expect(screen.getByLabelText("Price")).toHaveValue("20");
    expect(screen.queryByLabelText("Price 2")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Remove price/ }),
    ).not.toBeInTheDocument();
  });

  it("lists a problem on a later price row with its number and focuses it", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole("button", { name: "Add price" }));
    await user.click(screen.getByRole("button", { name: "Save as draft" }));

    await user.click(await screen.findByRole("button", { name: "Price 2" }));

    expect(screen.getByLabelText("Price 2")).toHaveFocus();
  });
});
