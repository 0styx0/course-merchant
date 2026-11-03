import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

import { draftedAdminCourse } from "@/mocks/fixtures/admin-courses";

import type { CourseActionResult } from "../../save-course/course-action-result";
import { saveEditedDetailsAction } from "../../save-course/edit/save-edited-details.action";
import { EditCourseForm } from "../edit-course-form";
import { toEditFormPrefill } from "../edit-form-prefill";

export const saveAction = vi.mocked(saveEditedDetailsAction);
export const prefill = toEditFormPrefill(draftedAdminCourse);
const timeZones = ["America/New_York", "Europe/Paris"];

export function makeEditFormElement(prefillOverride = prefill) {
  return (
    <EditCourseForm
      courseId={draftedAdminCourse.id}
      prefill={prefillOverride}
      timeZones={timeZones}
    />
  );
}

export function renderForm(prefillOverride = prefill) {
  return render(makeEditFormElement(prefillOverride));
}

export function refusal(
  title: string,
  fieldErrors: { path: string; message: string }[],
): CourseActionResult {
  return {
    state: "failure",
    error: {
      problem: {
        title,
        detail: `${title} detail.`,
        code: "VALIDATION_FAILED",
      },
      fieldErrors,
    },
  };
}

export function setValue(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

export async function clickSave(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Save changes" }));
}

export function leaveEvent() {
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  return event;
}
