import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  action,
  fillValidForm,
  renderForm,
  uploadAction,
} from "./create-course-form.fixtures";
import { push } from "./create-course-form.mocks";

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
  uploadAction.mockResolvedValue({
    state: "success",
    data: { courseId: "c1" },
  });
});

async function pickTimeZone(
  user: ReturnType<typeof userEvent.setup>,
  search: string,
  option: string,
) {
  const zone = screen.getByRole("combobox", { name: "Time zone" });
  await user.clear(zone);
  await user.type(zone, search);
  await user.click(screen.getByRole("option", { name: option }));
}

describe("CourseForm", () => {
  it("starts on the browser's time zone when the list has it", async () => {
    vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({
      timeZone: "Europe/Paris",
    } as Intl.ResolvedDateTimeFormatOptions);
    renderForm();
    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: "Time zone" })).toHaveValue(
        "Europe/Paris",
      ),
    );
    vi.restoreAllMocks();
  });

  it("keeps the default time zone when the browser's isn't in the list", async () => {
    vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({
      timeZone: "UTC",
    } as Intl.ResolvedDateTimeFormatOptions);
    renderForm();
    expect(screen.getByRole("combobox", { name: "Time zone" })).toHaveValue(
      "America/New_York",
    );
    vi.restoreAllMocks();
  });

  it("uses the zone the admin picks in the schedule summary", async () => {
    const user = userEvent.setup();
    renderForm();
    await fillValidForm(user);
    const zone = screen.getByRole("combobox", { name: "Time zone" });
    await user.clear(zone);
    await user.type(zone, "paris");
    await user.click(screen.getByRole("option", { name: "Europe/Paris" }));
    expect(await screen.findAllByText(/Europe\/Paris/)).not.toHaveLength(0);
    expect(screen.getByText(/^Runs .*\(Europe\/Paris\)/)).toBeVisible();
  });

  it("re-checks the times when a pick makes the start past, and again when it is picked back", async () => {
    const user = userEvent.setup();
    renderForm();
    // Three hours ahead in New York, which is already past in Paris (hours ahead of it).
    const [date, time] = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "America/New_York",
      dateStyle: "short",
      timeStyle: "short",
    })
      .format(Date.now() + 3 * 60 * 60 * 1000)
      .split(" ");
    await pickTimeZone(user, "york", "America/New_York");
    await user.type(screen.getByLabelText("Start date"), date);
    await user.type(screen.getByLabelText("Start time"), time);
    expect(
      screen.queryByText("The start time must be in the future."),
    ).not.toBeInTheDocument();

    await pickTimeZone(user, "paris", "Europe/Paris");
    expect(
      await screen.findByText("The start time must be in the future."),
    ).toBeInTheDocument();

    await pickTimeZone(user, "york", "America/New_York");
    await waitFor(() =>
      expect(
        screen.queryByText("The start time must be in the future."),
      ).not.toBeInTheDocument(),
    );
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
