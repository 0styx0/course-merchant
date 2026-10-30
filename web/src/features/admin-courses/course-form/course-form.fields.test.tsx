import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderForm } from "./course-form.fixtures";

vi.mock(
  "next/navigation",
  async () => (await import("./course-form.mocks")).navigationMock,
);
vi.mock("../save-course/create-course.action", () => ({
  createCourseAction: vi.fn(),
}));
vi.mock("../save-course/update-course.action", () => ({
  updateCourseAction: vi.fn(),
}));
vi.mock("../save-course/upload-image/upload-course-image.action", () => ({
  uploadCourseImageAction: vi.fn(),
}));
vi.mock("../description-editor/description-editor", async () => ({
  DescriptionEditor: (await import("./course-form.mocks"))
    .MockDescriptionEditor,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("CourseForm", () => {
  it("groups the fields into named sections", () => {
    renderForm();

    for (const title of ["Basics", "Content", "Schedule", "Pricing"]) {
      expect(screen.getByRole("group", { name: title })).toBeInTheDocument();
    }
    expect(screen.getByRole("group", { name: "Pricing" })).toContainElement(
      screen.getByLabelText("Price"),
    );
  });

  it("explains the empty price start once for all price rows", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole("button", { name: "Add price" }));

    expect(screen.getAllByText(/Leave the date and time empty/)).toHaveLength(
      1,
    );
  });

  it("counts the name and summary, red past the limit", async () => {
    const user = userEvent.setup();
    renderForm();

    expect(screen.getByLabelText("Course name")).toHaveAccessibleDescription(
      "0 / 100",
    );
    await user.type(screen.getByLabelText("Course name"), "abc");
    expect(screen.getByText("3 / 100")).not.toHaveClass("text-destructive");

    await user.click(screen.getByLabelText("Summary"));
    await user.paste("x".repeat(301));
    expect(screen.getByText("301 / 300")).toHaveClass("text-destructive");
  });

  it("shows a message and marks the field invalid when an empty field loses focus", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByLabelText("Course name"));
    await user.tab();

    const name = screen.getByLabelText("Course name");
    expect(name).toHaveAttribute("aria-invalid", "true");
    expect(name).toHaveAccessibleDescription("0 / 100 Enter a course name.");
  });

  it("clears the message as the admin fixes the field", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByLabelText("Course name"));
    await user.tab();
    await user.type(screen.getByLabelText("Course name"), "A");

    expect(screen.getByLabelText("Course name")).toHaveAttribute(
      "aria-invalid",
      "false",
    );
    expect(screen.queryByText("Enter a course name.")).not.toBeInTheDocument();
  });

  it("shows no message on an end time the admin has not reached", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("Start date"), "2099-01-10");
    await user.type(screen.getByLabelText("Start time"), "09:00");

    expect(screen.getByLabelText("End time")).toHaveAttribute(
      "aria-invalid",
      "false",
    );
  });

  it("shows the course length once both times are valid", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("Start date"), "2099-01-10");
    await user.type(screen.getByLabelText("Start time"), "09:00");
    await user.type(screen.getByLabelText("End date"), "2099-01-10");
    await user.type(screen.getByLabelText("End time"), "11:30");

    expect(screen.getByText(/Lasts 2 hours 30 minutes\./)).toBeInTheDocument();
  });

  it("lists the price schedule, with Error in place of what is wrong", async () => {
    const user = userEvent.setup();
    renderForm();

    expect(screen.getByText(/^Price schedule \(/)).toBeInTheDocument();
    expect(screen.queryByText("Error")).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("Price"), "abc");
    expect(screen.getByText("Error")).toHaveClass("text-destructive");

    await user.clear(screen.getByLabelText("Price"));
    await user.type(screen.getByLabelText("Price"), "79,5");

    expect(screen.queryByText("Error")).not.toBeInTheDocument();
    expect(screen.getByRole("listitem")).toHaveTextContent(
      "$79.50 from when the course is published",
    );
  });

  it("puts a $ before the price", () => {
    renderForm();
    expect(screen.getByText("$")).toBeInTheDocument();
  });
});
