import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  clickSave,
  leaveEvent,
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
});

describe("EditCourseForm", () => {
  it("starts with every field filled and no errors or leave warning", () => {
    renderForm();

    expect(screen.getByLabelText("Course name")).toHaveValue(
      "React Fundamentals",
    );
    expect(screen.getByLabelText("Summary")).toHaveValue("Learn React");
    expect(screen.getByLabelText("Content link")).toHaveValue(
      "https://example.com/course",
    );
    expect(screen.getByRole("combobox", { name: "Time zone" })).toHaveValue(
      "America/New_York",
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(leaveEvent().defaultPrevented).toBe(false);
  });

  it("lists an empty name and sends no request", async () => {
    const user = userEvent.setup();
    renderForm();

    setValue("Course name", "");
    await clickSave(user);

    const list = (
      await screen.findByRole("heading", { name: /Fix 1 problem/ })
    ).closest("[role=alert]");
    expect(list).toHaveTextContent("Course name: Enter a course name.");
    expect(saveAction).not.toHaveBeenCalled();
  });

  it("asks for a time zone when the stored one is not a real zone", async () => {
    const user = userEvent.setup();
    renderForm({
      ...prefill,
      values: {
        ...prefill.values,
        schedule: { ...prefill.values.schedule, timeZone: "Not/AZone" },
      },
    });

    await clickSave(user);

    const list = (
      await screen.findByRole("heading", { name: /Fix 1 problem/ })
    ).closest("[role=alert]");
    expect(list).toHaveTextContent("Time zone: Choose a time zone.");
    expect(saveAction).not.toHaveBeenCalled();
  });

  describe("leave-page warning", () => {
    it("is on after an edit", async () => {
      renderForm();
      setValue("Course name", "Renamed");
      await waitFor(() => expect(leaveEvent().defaultPrevented).toBe(true));
    });

    it("is off after a save", async () => {
      const user = userEvent.setup();
      saveAction.mockResolvedValue({
        state: "success",
        data: { courseId: "c1" },
      });
      renderForm();
      setValue("Course name", "Renamed");
      await clickSave(user);
      expect(await screen.findByRole("status")).toHaveTextContent("Saved");
      await waitFor(() => expect(leaveEvent().defaultPrevented).toBe(false));
    });
  });
});
