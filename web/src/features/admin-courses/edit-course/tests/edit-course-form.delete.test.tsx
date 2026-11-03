import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { draftedAdminCourse } from "@/mocks/fixtures/admin-courses";

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

type TestUser = ReturnType<typeof userEvent.setup>;

function statusOption(name: string) {
  return screen.getByRole("radio", { name });
}

async function saveAsDeleted(user: TestUser) {
  await user.click(statusOption("Deleted"));
  await clickSave(user);
}

function findDeleteDialog() {
  return screen.findByRole("alertdialog", { name: "Delete this course?" });
}

function mockSaveSucceeds() {
  saveAction.mockResolvedValue({ state: "success", data: { courseId: "c1" } });
}

function expectSavedWithStatus(status: string) {
  return waitFor(() =>
    expect(saveAction).toHaveBeenCalledWith(
      draftedAdminCourse.id,
      expect.objectContaining({ status }),
      prefill.loadedSchedule,
      prefill.loadedPrices,
    ),
  );
}

async function openDialogAfterRename(user: TestUser) {
  renderForm();
  setValue("Course name", "Renamed");
  await saveAsDeleted(user);
  return findDeleteDialog();
}

async function expectDeleteDeclined() {
  await waitFor(() =>
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
  );
  expect(saveAction).not.toHaveBeenCalled();
  expect(screen.getByLabelText("Course name")).toHaveValue("Renamed");
  expect(statusOption("Drafted")).toBeChecked();
  expect(statusOption("Deleted")).not.toBeChecked();
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("EditCourseForm delete confirmation", () => {
  it("asks before deleting and sends nothing yet", async () => {
    const user = userEvent.setup();
    renderForm();

    await saveAsDeleted(user);

    expect(await findDeleteDialog()).toHaveTextContent(
      "It leaves the admin list, and students can no longer find or buy it.",
    );
    expect(saveAction).not.toHaveBeenCalled();
  });

  it("shows the usual errors and no dialog when the form is invalid", async () => {
    const user = userEvent.setup();
    renderForm();
    setValue("Course name", "");

    await saveAsDeleted(user);

    expect(
      await screen.findByRole("button", { name: "Course name" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(saveAction).not.toHaveBeenCalled();
  });

  it("saves a course loaded as deleted with no dialog", async () => {
    const user = userEvent.setup();
    mockSaveSucceeds();
    renderForm(
      toEditFormPrefill({
        ...draftedAdminCourse,
        status: { name: "deleted", changedAt: "2026-10-15T18:30:00Z" },
      }),
    );

    await clickSave(user);

    expect(await screen.findByRole("status")).toHaveTextContent("Saved");
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("saves again with no dialog once the reload shows the course as deleted", async () => {
    const user = userEvent.setup();
    mockSaveSucceeds();
    const view = renderForm();
    await saveAsDeleted(user);
    await user.click(
      await screen.findByRole("button", { name: "Delete course" }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent("Saved");

    view.rerender(
      makeEditFormElement(
        toEditFormPrefill({
          ...draftedAdminCourse,
          status: { name: "deleted", changedAt: "2026-11-03T12:00:00Z" },
        }),
      ),
    );
    await clickSave(user);

    await waitFor(() => expect(saveAction).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("keeps the course and the form on Keep the course", async () => {
    const user = userEvent.setup();
    await openDialogAfterRename(user);

    await user.click(screen.getByRole("button", { name: "Keep the course" }));

    await expectDeleteDeclined();
  });

  it("keeps the course and the form on Escape", async () => {
    const user = userEvent.setup();
    await openDialogAfterRename(user);

    await user.keyboard("{Escape}");

    await expectDeleteDeclined();
  });

  it("saves the loaded status after Keep the course, with no dialog", async () => {
    const user = userEvent.setup();
    mockSaveSucceeds();
    await openDialogAfterRename(user);
    await user.click(screen.getByRole("button", { name: "Keep the course" }));

    await clickSave(user);

    await expectSavedWithStatus("drafted");
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("returns a course loaded as archived to Archived on Keep the course", async () => {
    const user = userEvent.setup();
    renderForm(
      toEditFormPrefill({
        ...draftedAdminCourse,
        status: { name: "archived", changedAt: "2026-10-15T18:30:00Z" },
      }),
    );
    await saveAsDeleted(user);
    await findDeleteDialog();

    await user.click(screen.getByRole("button", { name: "Keep the course" }));

    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
    expect(saveAction).not.toHaveBeenCalled();
    expect(statusOption("Archived")).toBeChecked();
    expect(statusOption("Deleted")).not.toBeChecked();
  });

  it("leaves the form clean after Escape when nothing else changed", async () => {
    const user = userEvent.setup();
    renderForm();
    await saveAsDeleted(user);
    await findDeleteDialog();

    await user.keyboard("{Escape}");

    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
    expect(leaveEvent().defaultPrevented).toBe(false);
  });

  it("leaves the form clean after Keep the course when nothing else changed", async () => {
    const user = userEvent.setup();
    renderForm();
    await saveAsDeleted(user);
    await findDeleteDialog();

    await user.click(screen.getByRole("button", { name: "Keep the course" }));

    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
    expect(leaveEvent().defaultPrevented).toBe(false);
  });

  it("saves with status deleted on Delete course, then says Saved", async () => {
    const user = userEvent.setup();
    mockSaveSucceeds();
    await openDialogAfterRename(user);

    await user.click(screen.getByRole("button", { name: "Delete course" }));

    await expectSavedWithStatus("deleted");
    expect(await screen.findByRole("status")).toHaveTextContent("Saved");
  });

  it("shows the API's refusal after Delete course and keeps the form", async () => {
    const user = userEvent.setup();
    saveAction.mockResolvedValue(refusal("Course not deletable", []));
    await openDialogAfterRename(user);

    await user.click(screen.getByRole("button", { name: "Delete course" }));

    expect(
      await screen.findByText("Course not deletable detail."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Course name")).toHaveValue("Renamed");
  });

  it("saves another status with no dialog", async () => {
    const user = userEvent.setup();
    mockSaveSucceeds();
    renderForm();

    await user.click(statusOption("Archived"));
    await clickSave(user);

    await expectSavedWithStatus("archived");
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
});
