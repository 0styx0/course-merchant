import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { draftedAdminCourse } from "@/mocks/fixtures/admin-courses";

import { EditCourseForm } from "../edit-course-form";
import { leaveEvent, prefill, setValue } from "./edit-course-form.fixtures";

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

function renderFormArrivingFromCreate() {
  return render(
    <EditCourseForm
      courseId={draftedAdminCourse.id}
      prefill={prefill}
      timeZones={["America/New_York"]}
      startingSavedNote="Saved as a draft"
    />,
  );
}

beforeEach(() => {
  window.history.replaceState(
    null,
    "",
    `/admin/courses/${draftedAdminCourse.id}/edit?saved=draft`,
  );
});

describe("EditCourseForm saved note", () => {
  it("says the course was saved as a draft when it starts with that note", () => {
    renderFormArrivingFromCreate();

    expect(screen.getByRole("status")).toHaveTextContent("Saved as a draft");
  });

  it("shows no note without a starting note", () => {
    render(
      <EditCourseForm
        courseId={draftedAdminCourse.id}
        prefill={prefill}
        timeZones={["America/New_York"]}
      />,
    );

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("drops the saved flag from the address, so a reload shows no note", () => {
    renderFormArrivingFromCreate();

    expect(window.location.pathname).toBe(
      `/admin/courses/${draftedAdminCourse.id}/edit`,
    );
    expect(window.location.search).toBe("");
  });

  it("hides the note at the first change", async () => {
    renderFormArrivingFromCreate();

    setValue("Course name", "Renamed");

    await waitFor(() =>
      expect(screen.queryByRole("status")).not.toBeInTheDocument(),
    );
  });

  it("turns the leave warning on at the first change", async () => {
    renderFormArrivingFromCreate();
    expect(leaveEvent().defaultPrevented).toBe(false);

    setValue("Course name", "Renamed");

    await waitFor(() => expect(leaveEvent().defaultPrevented).toBe(true));
  });
});
