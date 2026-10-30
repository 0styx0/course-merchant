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

const PAST_START = "The start time must be in the future.";
const END_BEFORE_START = "The end time must be after the start time.";

describe("CourseForm schedule fields", () => {
  it("sets the end date's minimum to the start date, and none while it is empty", async () => {
    const user = userEvent.setup();
    renderForm();
    expect(screen.getByLabelText("End date")).not.toHaveAttribute("min");

    await user.type(screen.getByLabelText("Start date"), "2099-03-05");
    expect(screen.getByLabelText("End date")).toHaveAttribute(
      "min",
      "2099-03-05",
    );

    await user.clear(screen.getByLabelText("Start date"));
    expect(screen.getByLabelText("End date")).not.toHaveAttribute("min");
  });

  it("shows a past start at once and clears it when corrected, with no blur", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("Start date"), "2000-01-01");
    await user.type(screen.getByLabelText("Start time"), "09:00");
    expect(await screen.findByText(PAST_START)).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Start date"));
    await user.type(screen.getByLabelText("Start date"), "2099-01-01");
    expect(screen.queryByText(PAST_START)).not.toBeInTheDocument();
  });

  it("re-checks a touched end when the start changes", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText("End date"), "2099-01-01");
    await user.type(screen.getByLabelText("End time"), "10:00");
    await user.type(screen.getByLabelText("Start date"), "2099-01-02");
    await user.type(screen.getByLabelText("Start time"), "09:00");
    expect(await screen.findByText(END_BEFORE_START)).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Start date"));
    await user.type(screen.getByLabelText("Start date"), "2099-01-01");

    expect(screen.queryByText(END_BEFORE_START)).not.toBeInTheDocument();
  });

  it("leaves an untouched end alone when only the start date changes", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("Start date"), "2099-01-01");

    expect(screen.queryByText("Enter an end date.")).not.toBeInTheDocument();
    expect(screen.queryByText("Enter an end time.")).not.toBeInTheDocument();
  });

  it("does not check a field that was neither changed nor touched", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("Start date"), "2099-01-01");

    expect(screen.queryByText("Enter a start time.")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Start time")).not.toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("shows a schedule-wide message once, in the Schedule line, not under the time field", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("Start date"), "2000-01-01");
    await user.type(screen.getByLabelText("Start time"), "09:00");

    const message = await screen.findByText(PAST_START);
    const startTime = screen.getByLabelText("Start time");
    expect(screen.getAllByText(PAST_START)).toHaveLength(1);
    expect(startTime.closest("[data-invalid]")).not.toContainElement(message);
    expect(startTime).toHaveAttribute("aria-invalid", "true");
    expect(startTime).toHaveAccessibleDescription(PAST_START);
  });

  it("shows the start and end messages together, in page order", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("Start date"), "2000-01-02");
    await user.type(screen.getByLabelText("Start time"), "09:00");
    await user.type(screen.getByLabelText("End date"), "2000-01-01");
    await user.type(screen.getByLabelText("End time"), "10:00");

    const start = await screen.findByText(PAST_START);
    const end = await screen.findByText(END_BEFORE_START);
    expect(
      start.compareDocumentPosition(end) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByLabelText("End time")).toHaveAccessibleDescription(
      expect.stringContaining(END_BEFORE_START),
    );
  });

  it("keeps a required message under its own field", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("Start date"), "2099-01-01");
    await user.click(screen.getByLabelText("Start time"));
    await user.tab();

    const message = await screen.findByText("Enter a start time.");
    expect(
      screen.getByLabelText("Start time").closest("[data-invalid]"),
    ).toContainElement(message);
  });

  it("lists a schedule-wide problem in the error list after submit", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText("Start date"), "2000-01-01");
    await user.type(screen.getByLabelText("Start time"), "09:00");

    await user.click(screen.getByRole("button", { name: "Save as draft" }));

    expect(
      await screen.findByRole("button", { name: "Start time" }),
    ).toBeInTheDocument();
  });
});
