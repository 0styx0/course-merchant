import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createCourseAction } from "../../save-course/create/create-course.action";
import { fillValidForm, renderForm } from "./create-course-form.fixtures";

vi.mock(
  "next/navigation",
  async () => (await import("./create-course-form.mocks")).navigationMock,
);
vi.mock("../../save-course/create/create-course.action", () => ({
  createCourseAction: vi.fn(),
}));
vi.mock("../../save-course/create/retry-draft-save.action", () => ({
  retryDraftSaveAction: vi.fn(),
}));
vi.mock("../../save-course/upload-image/upload-course-image.action", () => ({
  uploadCourseImageAction: vi.fn(),
}));
vi.mock("../../description-editor/description-editor", async () => ({
  DescriptionEditor: (await import("./create-course-form.mocks"))
    .MockDescriptionEditor,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

const PAST_START = "The start time must be in the future.";
const END_BEFORE_START = "The end time must be after the start time.";
const END_DATE_BEFORE_START =
  "The end date must be on or after the start date.";

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
    expect(await screen.findByText(END_DATE_BEFORE_START)).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Start date"));
    await user.type(screen.getByLabelText("Start date"), "2099-01-01");

    expect(screen.queryByText(END_DATE_BEFORE_START)).not.toBeInTheDocument();
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

  it("shows a schedule-wide message once, under the box it belongs to", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("Start date"), "2000-01-01");
    await user.type(screen.getByLabelText("Start time"), "09:00");

    const message = await screen.findByText(PAST_START);
    const startTime = screen.getByLabelText("Start time");
    expect(screen.getAllByText(PAST_START)).toHaveLength(1);
    expect(startTime.closest("[data-invalid]")).toContainElement(message);
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
    const end = await screen.findByText(END_DATE_BEFORE_START);
    expect(
      Boolean(
        start.compareDocumentPosition(end) & Node.DOCUMENT_POSITION_FOLLOWING,
      ),
    ).toBe(true);
    expect(
      screen.getByLabelText("Start time").closest("[data-invalid]"),
    ).toContainElement(start);
    expect(
      screen.getByLabelText("End date").closest("[data-invalid]"),
    ).toContainElement(end);
    expect(screen.getByLabelText("End date")).toHaveAccessibleDescription(
      expect.stringContaining(END_DATE_BEFORE_START),
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

  it("flags an earlier end date on End date at once, and a later one clears it", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText("Start date"), "2099-01-05");

    await user.type(screen.getByLabelText("End date"), "2099-01-04");

    const message = await screen.findByText(END_DATE_BEFORE_START);
    const endDate = screen.getByLabelText("End date");
    expect(endDate.closest("[data-invalid]")).toContainElement(message);
    expect(endDate).toHaveAttribute("aria-invalid", "true");

    await user.clear(endDate);
    await user.type(endDate, "2099-01-06");
    expect(screen.queryByText(END_DATE_BEFORE_START)).not.toBeInTheDocument();
    expect(endDate).not.toHaveAttribute("aria-invalid", "true");
  });

  it("flags a reached End date when the start date moves past it, and leaves an unreached one clean", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText("Start date"), "2099-01-05");
    expect(screen.queryByText(END_DATE_BEFORE_START)).not.toBeInTheDocument();
    expect(screen.getByLabelText("End date")).not.toHaveAttribute(
      "aria-invalid",
      "true",
    );

    await user.type(screen.getByLabelText("End date"), "2099-01-06");
    await user.clear(screen.getByLabelText("Start date"));
    await user.type(screen.getByLabelText("Start date"), "2099-01-09");

    const message = await screen.findByText(END_DATE_BEFORE_START);
    expect(
      screen.getByLabelText("End date").closest("[data-invalid]"),
    ).toContainElement(message);
  });

  it("shows a same-day end not after the start on End time only", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText("Start date"), "2099-01-05");
    await user.type(screen.getByLabelText("Start time"), "09:00");
    await user.type(screen.getByLabelText("End date"), "2099-01-05");
    await user.type(screen.getByLabelText("End time"), "08:00");

    const message = await screen.findByText(END_BEFORE_START);
    expect(
      screen.getByLabelText("End time").closest("[data-invalid]"),
    ).toContainElement(message);
    expect(screen.queryByText(END_DATE_BEFORE_START)).not.toBeInTheDocument();
    expect(screen.getByLabelText("End date")).not.toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("refuses to save an earlier end date, names End date in the list and focuses it from the link", async () => {
    const user = userEvent.setup();
    renderForm();
    await fillValidForm(user);
    await user.clear(screen.getByLabelText("End date"));
    await user.type(screen.getByLabelText("End date"), "2099-01-09");

    await user.click(screen.getByRole("button", { name: "Save as draft" }));

    const heading = await screen.findByRole("heading", {
      name: "Fix 1 problem before saving",
    });
    const entries = within(
      heading.closest<HTMLElement>("[role=alert]")!,
    ).getAllByRole("listitem");
    expect(entries[0]).toHaveTextContent(`End date: ${END_DATE_BEFORE_START}`);
    expect(createCourseAction).not.toHaveBeenCalled();

    await user.click(
      within(entries[0]).getByRole("button", { name: "End date" }),
    );
    expect(screen.getByLabelText("End date")).toHaveFocus();
  });

  it("lists a schedule-wide problem in the error list after submit", async () => {
    const user = userEvent.setup();
    renderForm();
    await fillValidForm(user);
    await user.clear(screen.getByLabelText("Start date"));
    await user.type(screen.getByLabelText("Start date"), "2000-01-01");

    await user.click(screen.getByRole("button", { name: "Save as draft" }));

    const heading = await screen.findByRole("heading", {
      name: "Fix 1 problem before saving",
    });
    const errorList = heading.closest<HTMLElement>("[role=alert]")!;
    const entries = within(errorList).getAllByRole("listitem");
    expect(entries).toHaveLength(1);
    expect(entries[0]).toHaveTextContent(`Start time: ${PAST_START}`);
  });
});
