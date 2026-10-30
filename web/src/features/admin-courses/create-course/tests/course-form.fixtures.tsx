import { fireEvent, render, screen } from "@testing-library/react";
import type userEvent from "@testing-library/user-event";
import { vi } from "vitest";

import { CreateCourseForm } from "../create-course-form";
import { createCourseAction } from "../../save-course/create-course.action";
import { updateCourseAction } from "../../save-course/update-course.action";
import { uploadCourseImageAction } from "../../save-course/upload-image/upload-course-image.action";

export const action = vi.mocked(createCourseAction);
export const updateAction = vi.mocked(updateCourseAction);
export const uploadAction = vi.mocked(uploadCourseImageAction);

type ImageSize = { width: number; height: number };

/** jsdom can neither decode an image nor make a preview address, so stand in for both. */
function stubImageBrowserApis({ width, height }: ImageSize) {
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn().mockResolvedValue({ width, height, close: vi.fn() }),
  );
  URL.createObjectURL = vi.fn(() => "blob:preview");
  URL.revokeObjectURL = vi.fn();
}

function imageFile(type = "image/webp") {
  return new File([new Uint8Array(10)], "photo", { type });
}

export async function chooseImage(
  user: ReturnType<typeof userEvent.setup>,
  size: ImageSize = { width: 1600, height: 900 },
) {
  stubImageBrowserApis(size);
  await user.upload(screen.getByLabelText("Image"), imageFile());
}

// Each field's own message is also an alert, so find the list by its heading.
export function summaryWithHeading(name: RegExp | string) {
  const summary = screen.getByRole("heading", { name }).closest("[role=alert]");
  if (!(summary instanceof HTMLElement)) throw new Error("No error list");
  return summary;
}

export function renderForm() {
  return render(
    <CreateCourseForm timeZones={["America/New_York", "Europe/Paris"]} />,
  );
}

/** Sets a whole value in one change event; typing it key by key is what made the form tests slow. */
function setValue(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

export async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  setValue("Course name", "Intro to Emptiness");
  setValue("Summary", "A short summary.");
  await user.click(
    await screen.findByRole("button", { name: "Fill description" }),
  );
  await chooseImage(user);
  setValue("Content link", "https://example.com/c");
  setValue("Start date", "2099-01-10");
  setValue("Start time", "09:00");
  setValue("End date", "2099-01-10");
  setValue("End time", "11:30");
  setValue("Price", "79.50");
}
