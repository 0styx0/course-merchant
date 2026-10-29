import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { action, fillValidForm, renderForm } from "./course-form.fixtures";
import { push } from "./course-form.mocks";

vi.mock(
  "next/navigation",
  async () => (await import("./course-form.mocks")).navigationMock,
);
vi.mock("../save-course/create-course.action", () => ({
  createCourseAction: vi.fn(),
}));
vi.mock("../description-editor/description-editor", async () => ({
  DescriptionEditor: (await import("./course-form.mocks"))
    .MockDescriptionEditor,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("CourseForm", () => {
  it("starts on the browser's time zone when the list has it", async () => {
    vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({
      timeZone: "Europe/Paris",
    } as Intl.ResolvedDateTimeFormatOptions);
    renderForm();
    await waitFor(() =>
      expect(screen.getByLabelText("Time zone")).toHaveValue("Europe/Paris"),
    );
    vi.restoreAllMocks();
  });

  it("keeps the default time zone when the browser's isn't in the list", async () => {
    vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({
      timeZone: "UTC",
    } as Intl.ResolvedDateTimeFormatOptions);
    renderForm();
    expect(screen.getByLabelText("Time zone")).toHaveValue("America/New_York");
    vi.restoreAllMocks();
  });

  describe("leave-page warning", () => {
    function leaveEvent() {
      const event = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(event);
      return event;
    }

    it("is off while the form is untouched", () => {
      renderForm();
      expect(leaveEvent().defaultPrevented).toBe(false);
    });

    it("is on once the admin has typed something", async () => {
      const user = userEvent.setup();
      renderForm();
      await user.type(screen.getByLabelText("Course name"), "A");
      expect(leaveEvent().defaultPrevented).toBe(true);
    });

    it("is off after a successful save", async () => {
      const user = userEvent.setup();
      action.mockResolvedValue({ state: "success", data: { courseId: "c1" } });
      renderForm();
      await fillValidForm(user);
      await user.click(screen.getByRole("button", { name: "Save as draft" }));
      await waitFor(() => expect(push).toHaveBeenCalled());
      expect(leaveEvent().defaultPrevented).toBe(false);
    });
  });
});
