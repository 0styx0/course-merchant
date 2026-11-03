import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { draftedAdminCourse } from "@/mocks/fixtures/admin-courses";

import { toEditFormPrefill } from "../edit-form-prefill";
import {
  clickSave,
  makeEditFormElement,
  prefill,
  renderForm,
  saveAction,
  setValue,
} from "./edit-course-form.fixtures";

vi.mock(
  "next/navigation",
  async () => (await import("./edit-course-form.mocks")).navigationMock,
);
vi.mock("../../save-course/edit/save-edited-details.action", () => ({
  saveEditedDetailsAction: vi.fn(),
}));
vi.mock("../../save-course/upload-image/upload-course-image.action", () => ({
  uploadCourseImageAction: vi.fn(),
}));
vi.mock("../../description-editor/description-editor", async () => ({
  DescriptionEditor: (await import("./edit-course-form.mocks"))
    .MockDescriptionEditor,
}));

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-03T12:00:00Z"));
});

afterEach(() => vi.useRealTimers());

const END_DATE_BEFORE_START =
  "The end date must be on or after the start date.";

describe("EditCourseForm schedule", () => {
  it("shows the times in the chosen zone, and the line follows a zone change", async () => {
    const user = userEvent.setup();
    renderForm();
    expect(
      screen.getByText(/^Runs .*2:00 PM to .*4:00 PM \(America\/New_York\)/),
    ).toBeVisible();

    const zone = screen.getByRole("combobox", { name: "Time zone" });
    await user.clear(zone);
    await user.type(zone, "paris");
    await user.click(screen.getByRole("option", { name: "Europe/Paris" }));

    expect(
      screen.getByText(/^Runs .*2:00 PM to .*4:00 PM \(Europe\/Paris\)/),
    ).toBeVisible();
  });

  it("sends no request when a changed start is in the past", async () => {
    const user = userEvent.setup();
    renderForm({
      ...prefill,
      values: {
        ...prefill.values,
        schedule: { ...prefill.values.schedule, startTimeOfDay: "13:00" },
      },
    });

    await clickSave(user);

    await screen.findAllByText("The start time must be in the future.");
    expect(
      screen.getByLabelText("Start time").closest("[data-invalid]"),
    ).toHaveTextContent("The start time must be in the future.");
    expect(saveAction).not.toHaveBeenCalled();
  });

  it("sends no request when the zone change moves a started course's times into the past", async () => {
    const user = userEvent.setup();
    renderForm();

    const zone = screen.getByRole("combobox", { name: "Time zone" });
    await user.clear(zone);
    await user.type(zone, "paris");
    await user.click(screen.getByRole("option", { name: "Europe/Paris" }));
    await clickSave(user);

    await screen.findAllByText("The start time must be in the future.");
    expect(
      screen.getByLabelText("Start time").closest("[data-invalid]"),
    ).toHaveTextContent("The start time must be in the future.");
    expect(
      screen.getByLabelText("End time").closest("[data-invalid]"),
    ).toHaveTextContent("The end time must be in the future.");
    expect(saveAction).not.toHaveBeenCalled();
  });

  it("fills the four boxes from the stored times and shows no problem", () => {
    renderForm();

    expect(screen.getByLabelText("Start date")).toHaveValue("2026-10-01");
    expect(screen.getByLabelText("Start time")).toHaveValue("14:00");
    expect(screen.getByLabelText("End date")).toHaveValue("2026-10-01");
    expect(screen.getByLabelText("End time")).toHaveValue("16:00");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows a changed start in the past under Start time and in the error list", async () => {
    const user = userEvent.setup();
    renderForm();

    setValue("Start date", "2026-10-02");
    await clickSave(user);

    await screen.findAllByText("The start time must be in the future.");
    expect(
      screen.getByLabelText("Start time").closest("[data-invalid]"),
    ).toHaveTextContent("The start time must be in the future.");
    expect(
      screen.getByRole("button", { name: "Start time" }),
    ).toBeInTheDocument();
  });

  it("clears the problem once the times are corrected", async () => {
    const user = userEvent.setup();
    renderForm();
    setValue("Start date", "2026-10-02");
    await clickSave(user);
    await screen.findAllByText("The start time must be in the future.");

    setValue("Start date", "2030-01-01");
    setValue("End date", "2030-01-02");

    await waitFor(() =>
      expect(
        screen.queryByText("The start time must be in the future."),
      ).not.toBeInTheDocument(),
    );
  });

  it("shows an end date before the start date on End date at once, with no request", async () => {
    const user = userEvent.setup();
    renderForm();

    setValue("Start date", "2030-01-02");
    setValue("End date", "2030-01-01");

    const endDate = screen.getByLabelText("End date");
    expect(await screen.findByText(END_DATE_BEFORE_START)).toBeVisible();
    expect(endDate).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("End time")).not.toHaveAttribute(
      "aria-invalid",
      "true",
    );

    await clickSave(user);
    expect(
      await screen.findByRole("button", { name: "End date" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "End date" }));
    expect(endDate).toHaveFocus();
    expect(saveAction).not.toHaveBeenCalled();
  });

  it("replaces the in-the-future message with the end-date one when the end date is earlier", async () => {
    renderForm();

    setValue("End date", "2026-09-30");

    expect(await screen.findByText(END_DATE_BEFORE_START)).toBeVisible();
    expect(
      screen.queryByText("The end time must be in the future."),
    ).not.toBeInTheDocument();
  });

  it("flags a reached End date when the start date moves past it, and a later end date clears it", async () => {
    renderForm();
    setValue("End date", "2030-01-05");
    setValue("Start date", "2030-01-06");
    expect(await screen.findByText(END_DATE_BEFORE_START)).toBeVisible();

    setValue("End date", "2030-01-07");
    await waitFor(() =>
      expect(screen.queryByText(END_DATE_BEFORE_START)).not.toBeInTheDocument(),
    );
  });

  it("leaves End date clean when the start date moves and the end date was never reached", () => {
    renderForm();

    setValue("Start date", "2030-01-06");

    expect(screen.queryByText(END_DATE_BEFORE_START)).not.toBeInTheDocument();
    expect(screen.getByLabelText("End date")).not.toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("shows a same-day end not after the start on End time only", async () => {
    renderForm();

    setValue("Start date", "2030-01-02");
    setValue("End date", "2030-01-02");
    setValue("End time", "13:00");

    expect(
      await screen.findByText("The end time must be after the start time."),
    ).toBeVisible();
    expect(screen.getByLabelText("End date")).not.toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  describe("progress note", () => {
    const now = Date.parse("2026-11-03T12:00:00Z");
    const prefillWithTimes = (startTime: string, endTime: string) =>
      toEditFormPrefill(
        {
          ...draftedAdminCourse,
          schedule: { ...draftedAdminCourse.schedule, startTime, endTime },
        },
        now,
      );
    const futurePrefill = prefillWithTimes(
      "2026-11-10T18:00:00Z",
      "2026-11-10T20:00:00Z",
    );

    it("says an ended course has ended", () => {
      renderForm();
      expect(
        screen.getByText(
          "This course has ended. You can keep its times, but a changed time must be in the future.",
        ),
      ).toBeVisible();
    });

    it("says a running course has started", () => {
      renderForm(
        prefillWithTimes("2026-11-03T11:00:00Z", "2026-11-03T14:00:00Z"),
      );
      expect(
        screen.getByText(
          "This course has started. You can keep its times, but a changed time must be in the future.",
        ),
      ).toBeVisible();
    });

    it("shows no note for a course that starts later", () => {
      renderForm(futurePrefill);
      expect(
        screen.queryByText(/a changed time must be in the future/),
      ).not.toBeInTheDocument();
    });

    it("hides the note when the reloaded course has its times ahead", () => {
      const view = renderForm();
      expect(screen.getByText(/This course has ended/)).toBeVisible();

      view.rerender(makeEditFormElement(futurePrefill));

      expect(
        screen.queryByText(/a changed time must be in the future/),
      ).not.toBeInTheDocument();
    });
  });
});
