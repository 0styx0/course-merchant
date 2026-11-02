import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { draftedAdminCourse } from "@/mocks/fixtures/admin-courses";

import type { CourseActionResult } from "../../save-course/course-action-result";
import { push } from "./edit-course-form.mocks";
import {
  clickSave,
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

describe("EditCourseForm saving", () => {
  it("saves the edited name with the rest as given, then goes to the home page", async () => {
    const user = userEvent.setup();
    saveAction.mockResolvedValue({
      state: "success",
      data: { courseId: "c1" },
    });
    renderForm();

    setValue("Course name", "Renamed");
    await clickSave(user);

    await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
    expect(saveAction).toHaveBeenCalledWith(
      draftedAdminCourse.id,
      { ...valuesWithoutImage, name: "Renamed" },
      prefill.loadedSchedule,
      prefill.loadedPrices,
    );
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
    await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
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
    await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
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
    expect(push).not.toHaveBeenCalled();
  });

  it("says the save couldn't happen when the action throws, without a draft note", async () => {
    const user = userEvent.setup();
    saveAction.mockRejectedValue(new Error("network"));
    renderForm();

    await clickSave(user);

    await screen.findByRole("heading", { name: "Couldn't save the course" });
    expect(screen.queryByText(/saved as a draft/)).not.toBeInTheDocument();
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
    await waitFor(() => expect(push).toHaveBeenCalled());
  });
});
