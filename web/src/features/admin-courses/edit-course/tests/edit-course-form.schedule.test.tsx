import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  clickSave,
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
vi.mock("../../description-editor/description-editor", async () => ({
  DescriptionEditor: (await import("./edit-course-form.mocks"))
    .MockDescriptionEditor,
}));

beforeEach(() => {
  vi.resetAllMocks();
});

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

  it("shows a changed start in the past on the schedule line and in the error list", async () => {
    const user = userEvent.setup();
    renderForm();

    setValue("Start date", "2026-10-02");
    await clickSave(user);

    expect(
      await screen.findAllByText("The start time must be in the future."),
    ).not.toHaveLength(0);
    expect(screen.getByRole("alert")).toHaveTextContent("Start time");
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

  it("shows an end that is not after the start on the schedule line", async () => {
    const user = userEvent.setup();
    renderForm();

    setValue("Start date", "2030-01-02");
    setValue("End date", "2030-01-01");
    await clickSave(user);

    expect(
      await screen.findAllByText("The end time must be after the start time."),
    ).not.toHaveLength(0);
    expect(saveAction).not.toHaveBeenCalled();
  });
});
