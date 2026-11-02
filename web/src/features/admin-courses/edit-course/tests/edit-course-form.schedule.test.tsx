import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  clickSave,
  prefill,
  renderForm,
  saveAction,
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
});
