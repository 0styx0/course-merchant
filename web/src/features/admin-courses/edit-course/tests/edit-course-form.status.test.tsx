import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { draftedAdminCourse } from "@/mocks/fixtures/admin-courses";

import { toEditFormPrefill } from "../edit-form-prefill";
import {
  clickSave,
  prefill,
  refusal,
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
vi.mock("../../save-course/upload-image/upload-course-image.action", () => ({
  uploadCourseImageAction: vi.fn(),
}));
vi.mock("../../description-editor/description-editor", async () => ({
  DescriptionEditor: (await import("./edit-course-form.mocks"))
    .MockDescriptionEditor,
}));

const publishRefusal = "Upload an image before publishing.";

function statusOption(name: string) {
  return screen.getByRole("radio", { name });
}

async function saveRefusedOnStatus(user: ReturnType<typeof userEvent.setup>) {
  saveAction.mockResolvedValue(
    refusal("Invalid course", [{ path: "status", message: publishRefusal }]),
  );
  renderForm();
  await user.click(statusOption("Published"));
  await clickSave(user);
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("EditCourseForm status", () => {
  it("chooses the loaded status", () => {
    renderForm();

    expect(statusOption("Drafted")).toBeChecked();
    expect(statusOption("Published")).not.toBeChecked();
  });

  it("chooses Archived when the course loads archived", () => {
    renderForm(
      toEditFormPrefill({
        ...draftedAdminCourse,
        status: { name: "archived", changedAt: "2026-10-15T18:30:00Z" },
      }),
    );

    expect(statusOption("Archived")).toBeChecked();
  });

  it("saves the chosen status", async () => {
    const user = userEvent.setup();
    saveAction.mockResolvedValue({
      state: "success",
      data: { courseId: "c1" },
    });
    renderForm();

    await user.click(statusOption("Archived"));
    await clickSave(user);

    await waitFor(() =>
      expect(saveAction).toHaveBeenCalledWith(
        draftedAdminCourse.id,
        expect.objectContaining({ status: "archived" }),
        prefill.loadedSchedule,
        prefill.loadedPrices,
      ),
    );
  });

  it("shows the API's refusal on the status field", async () => {
    const user = userEvent.setup();
    await saveRefusedOnStatus(user);

    const message = await screen.findAllByText(publishRefusal);
    expect(
      message.some((element) =>
        element.closest("fieldset")?.textContent?.startsWith("Status"),
      ),
    ).toBe(true);
  });

  it("names Status in the error list and focuses it on click", async () => {
    const user = userEvent.setup();
    await saveRefusedOnStatus(user);

    await user.click(await screen.findByRole("button", { name: "Status" }));

    expect(statusOption("Published")).toHaveFocus();
  });

  it("moves the choice to the next option with the down arrow", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(statusOption("Published"));
    await user.keyboard("{ArrowDown}");

    expect(statusOption("Drafted")).toBeChecked();
  });
});
