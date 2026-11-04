import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { draftedAdminCourse } from "@/mocks/fixtures/admin-courses";
import { FROZEN_NOW } from "@/test/frozen-now";

import type { CourseActionResult } from "../../save-course/course-action-result";
import { push } from "./edit-course-form.mocks";
import { toEditFormPrefill } from "../edit-form-prefill";
import {
  clickSave,
  leaveEvent,
  makeEditFormElement,
  prefill,
  refusal,
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

// The image goes up in its own request, never with the details.
const valuesWithoutImage = { ...prefill.values, image: undefined };

beforeEach(() => {
  vi.resetAllMocks();
});

const HOUR_MS = 3600_000;
const MINUTE_MS = 60_000;

const savedCourse: CourseActionResult = {
  state: "success",
  data: { courseId: "c1" },
};

/** The sample course with its start moved to `startTime`, as the page loads it at `renderMs`. It ends three hours after the frozen time. */
function loadCourseStartingAt(startTime: string, renderMs: number) {
  return toEditFormPrefill(
    {
      ...draftedAdminCourse,
      schedule: {
        ...draftedAdminCourse.schedule,
        startTime,
        endTime: new Date(FROZEN_NOW + 3 * HOUR_MS).toISOString(),
      },
    },
    renderMs,
  );
}

describe("EditCourseForm saving", () => {
  it("saves the edited name with the rest as given, then says Saved", async () => {
    const user = userEvent.setup();
    saveAction.mockResolvedValue({
      state: "success",
      data: { courseId: "c1" },
    });
    renderForm();

    setValue("Course name", "Renamed");
    await clickSave(user);

    expect(await screen.findByRole("status")).toHaveTextContent("Saved");
    expect(saveAction).toHaveBeenCalledWith(
      draftedAdminCourse.id,
      { ...valuesWithoutImage, name: "Renamed" },
      prefill.loadedSchedule,
      prefill.loadedPrices,
    );
    expect(push).not.toHaveBeenCalled();
  });

  it("shows a refusal, keeps the values, and replaces it with the next one", async () => {
    const user = userEvent.setup();
    saveAction
      .mockResolvedValueOnce(
        refusal("First refusal", [{ path: "name", message: "Name is taken." }]),
      )
      .mockResolvedValueOnce(
        refusal("Second refusal", [
          { path: "contentUrl", message: "Link is dead." },
        ]),
      )
      .mockResolvedValueOnce({ state: "success", data: { courseId: "c1" } });
    renderForm();

    setValue("Course name", "Renamed");
    await clickSave(user);
    await screen.findByRole("heading", { name: "First refusal" });
    expect(screen.getByText("First refusal detail.")).toBeVisible();
    expect(screen.getByLabelText("Course name")).toHaveAccessibleDescription(
      /Name is taken\./,
    );
    expect(screen.getByLabelText("Course name")).toHaveValue("Renamed");

    await clickSave(user);
    await screen.findByRole("heading", { name: "Second refusal" });
    expect(
      screen.queryByRole("heading", { name: "First refusal" }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Content link")).toHaveAccessibleDescription(
      /Link is dead\./,
    );

    await clickSave(user);
    expect(await screen.findByRole("status")).toHaveTextContent("Saved");
  });

  it("shows an error on a field the form lacks only above the form, and the next save goes through", async () => {
    const user = userEvent.setup();
    saveAction
      .mockResolvedValueOnce(
        refusal("Start refused", [
          { path: "schedule.startTime", message: "Start is in the past." },
        ]),
      )
      .mockResolvedValueOnce({ state: "success", data: { courseId: "c1" } });
    renderForm();

    await clickSave(user);
    await screen.findByRole("heading", { name: "Start refused" });
    expect(screen.queryByText("Start is in the past.")).not.toBeInTheDocument();

    await clickSave(user);
    expect(await screen.findByRole("status")).toHaveTextContent("Saved");
  });

  it("shows a server problem that has no field errors, and keeps the form", async () => {
    const user = userEvent.setup();
    saveAction.mockResolvedValue(refusal("Internal server error", []));
    renderForm();

    setValue("Course name", "Renamed");
    await clickSave(user);

    await screen.findByRole("heading", { name: "Internal server error" });
    expect(screen.getByText("Internal server error detail.")).toBeVisible();
    expect(screen.getByLabelText("Course name")).toHaveValue("Renamed");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("says the save couldn't happen when the action throws, without a draft note", async () => {
    const user = userEvent.setup();
    saveAction.mockRejectedValue(new Error("network"));
    renderForm();

    await clickSave(user);

    await screen.findByRole("heading", { name: "Couldn't save the course" });
    expect(screen.queryByText(/saved as a draft/i)).not.toBeInTheDocument();
  });

  it("is disabled and reads Saving… while saving", async () => {
    const user = userEvent.setup();
    let finish: (result: CourseActionResult) => void = () => {};
    saveAction.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    renderForm();

    await clickSave(user);

    expect(
      await screen.findByRole("button", { name: "Saving…" }),
    ).toBeDisabled();
    finish({ state: "success", data: { courseId: "c1" } });
    expect(await screen.findByRole("status")).toHaveTextContent("Saved");
  });

  it("shows no Saved after a refused save", async () => {
    const user = userEvent.setup();
    saveAction.mockResolvedValue(refusal("Refused", []));
    renderForm();

    await clickSave(user);

    await screen.findByRole("heading", { name: "Refused" });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("resets the fields to the reloaded course", () => {
    const view = renderForm();
    setValue("Course name", "Typed name");

    view.rerender(
      makeEditFormElement(
        toEditFormPrefill({ ...draftedAdminCourse, name: "Stored name" }),
      ),
    );

    expect(screen.getByLabelText("Course name")).toHaveValue("Stored name");
  });

  it("keeps Saved after the reload and drops it at the next change", async () => {
    const user = userEvent.setup();
    saveAction.mockResolvedValue(savedCourse);
    const view = renderForm();
    setValue("Course name", "Renamed");
    await clickSave(user);
    await screen.findByRole("status");

    view.rerender(
      makeEditFormElement(
        toEditFormPrefill({ ...draftedAdminCourse, name: "Renamed" }),
      ),
    );

    expect(screen.getByRole("status")).toHaveTextContent("Saved");
    setValue("Course name", "Renamed again");
    await waitFor(() => {
      expect(leaveEvent().defaultPrevented).toBe(true);
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });
  });

  describe("when the clock passes the loaded start", () => {
    const loadedStart = new Date(FROZEN_NOW + 30 * MINUTE_MS).toISOString();
    const reloadedStart = new Date(FROZEN_NOW + 45 * MINUTE_MS).toISOString();
    const clockAfterBothStarts = new Date(FROZEN_NOW + HOUR_MS);

    it("saves the reloaded start unchanged", async () => {
      const user = userEvent.setup();
      saveAction.mockResolvedValue(savedCourse);
      const view = renderForm(loadCourseStartingAt(loadedStart, FROZEN_NOW));
      vi.setSystemTime(clockAfterBothStarts);

      view.rerender(
        makeEditFormElement(
          loadCourseStartingAt(reloadedStart, clockAfterBothStarts.getTime()),
        ),
      );
      await clickSave(user);

      await waitFor(() => expect(saveAction).toHaveBeenCalled());
      // 12:45 UTC is 07:45 in the sample course's zone, America/New_York (UTC-5 in November).
      expect(saveAction.mock.calls[0]?.[1].schedule).toMatchObject({
        startDate: reloadedStart.slice(0, "YYYY-MM-DD".length),
        startTimeOfDay: "07:45",
      });
      expect(
        screen.queryByText("The start time must be in the future."),
      ).not.toBeInTheDocument();
    });

    it("refuses a changed start that lies before the clock", async () => {
      const user = userEvent.setup();
      renderForm(loadCourseStartingAt(loadedStart, FROZEN_NOW));
      vi.setSystemTime(clockAfterBothStarts);

      // 07:15 in America/New_York is 12:15 UTC, before the clock's 13:00 UTC.
      setValue("Start time", "07:15");
      await clickSave(user);

      await screen.findAllByText("The start time must be in the future.");
      expect(saveAction).not.toHaveBeenCalled();
    });
  });

  it("shows the stored date and time (New York) on a price row that was saved with an empty start", async () => {
    const user = userEvent.setup();
    const view = renderForm();
    await user.click(screen.getByRole("button", { name: "Add price" }));
    setValue("Price", "150");

    view.rerender(
      makeEditFormElement(
        toEditFormPrefill({
          ...draftedAdminCourse,
          prices: [
            ...draftedAdminCourse.prices,
            {
              id: "0b7a9c3e-1f2d-4e5a-8b6c-7d8e9f0a1b2c",
              amount: 15000,
              currency: "USD",
              effectiveAt: "2099-03-01T14:00:00Z",
            },
          ],
        }),
      ),
    );

    expect(screen.getByLabelText("Price start date")).toHaveValue("2099-03-01");
    expect(screen.getByLabelText("Price start time")).toHaveValue("09:00");
  });
});
