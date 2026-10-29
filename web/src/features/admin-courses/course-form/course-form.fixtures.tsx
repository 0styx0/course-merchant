import { render, screen } from "@testing-library/react";
import type userEvent from "@testing-library/user-event";
import { vi } from "vitest";

import { CourseForm } from "../course-form";
import { createCourseAction } from "../create-course.action";

export const action = vi.mocked(createCourseAction);

// Each field's own message is also an alert, so find the list by its heading.
export function summaryWithHeading(name: RegExp | string) {
  const summary = screen.getByRole("heading", { name }).closest("[role=alert]");
  if (!(summary instanceof HTMLElement)) throw new Error("No error list");
  return summary;
}

export function renderForm() {
  return render(
    <CourseForm timeZones={["America/New_York", "Europe/Paris"]} />,
  );
}

export async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Course name"), "Intro to Emptiness");
  await user.type(screen.getByLabelText("Summary"), "A short summary.");
  await user.click(
    await screen.findByRole("button", { name: "Fill description" }),
  );
  await user.type(
    screen.getByLabelText("Content link"),
    "https://example.com/c",
  );
  await user.type(screen.getByLabelText("Start date"), "2099-01-10");
  await user.type(screen.getByLabelText("Start time"), "09:00");
  await user.type(screen.getByLabelText("End date"), "2099-01-10");
  await user.type(screen.getByLabelText("End time"), "11:30");
  await user.type(screen.getByLabelText("Price"), "79.50");
}
