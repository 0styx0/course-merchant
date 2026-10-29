import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CreateCourseActionResult } from "../create-course.action";
import {
  action,
  fillValidForm,
  renderForm,
  summaryWithHeading,
} from "./course-form.fixtures";
import { push } from "./course-form.mocks";

vi.mock(
  "next/navigation",
  async () => (await import("./course-form.mocks")).navigationMock,
);
vi.mock("../create-course.action", () => ({ createCourseAction: vi.fn() }));
vi.mock("../description-editor/description-editor", async () => ({
  DescriptionEditor: (await import("./course-form.mocks"))
    .MockDescriptionEditor,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("CourseForm", () => {
  it("saves a valid form and goes to the home page", async () => {
    const user = userEvent.setup();
    action.mockResolvedValue({ state: "success", data: { courseId: "c1" } });
    renderForm();

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Save as draft" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
    expect(action).toHaveBeenCalledOnce();
    expect(action.mock.calls[0][0]).toMatchObject({
      name: "Intro to Emptiness",
      schedule: { timeZone: "America/New_York" },
    });
  });

  it("is disabled and reads Saving… while saving", async () => {
    const user = userEvent.setup();
    let finish: (result: CreateCourseActionResult) => void = () => {};
    action.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    renderForm();

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Save as draft" }));

    const saving = await screen.findByRole("button", { name: "Saving…" });
    expect(saving).toBeDisabled();

    finish({ state: "success", data: { courseId: "c1" } });
    await waitFor(() => expect(push).toHaveBeenCalled());
  });

  it("shows the server's field errors and problem, and enables the button again", async () => {
    const user = userEvent.setup();
    action.mockResolvedValue({
      state: "failure",
      error: {
        problem: {
          title: "Validation failed",
          detail: "The request contains 2 invalid fields.",
          code: "VALIDATION_FAILED",
        },
        fieldErrors: [
          { path: "prices.0.amountDollars", message: "Too cheap." },
          { path: "description", message: "Links must start with https://." },
        ],
      },
    });
    renderForm();

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Save as draft" }));

    await screen.findByRole("heading", { name: "Validation failed" });
    const summary = summaryWithHeading("Validation failed");
    expect(summary).toHaveTextContent("Price: Too cheap.");
    expect(summary).toHaveTextContent("Description: Links must start with");
    expect(screen.getByLabelText("Price")).toHaveAccessibleDescription(
      "Too cheap.",
    );
    expect(screen.getByText(/Description problem: Links/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save as draft" })).toBeEnabled();
    expect(push).not.toHaveBeenCalled();
  });

  it("shows a server problem that has no field errors", async () => {
    const user = userEvent.setup();
    action.mockResolvedValue({
      state: "failure",
      error: {
        problem: {
          title: "Internal server error",
          detail: "Please try again later.",
          code: "INTERNAL_SERVER_ERROR",
        },
        fieldErrors: [],
      },
    });
    renderForm();

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Save as draft" }));

    await screen.findByRole("heading", { name: "Internal server error" });
    expect(summaryWithHeading("Internal server error")).toHaveTextContent(
      "Please try again later.",
    );
  });

  it("shows a server error on the second price row", async () => {
    const user = userEvent.setup();
    action.mockResolvedValue({
      state: "failure",
      error: {
        problem: {
          title: "Validation failed",
          detail: "The request contains 1 invalid field.",
          code: "VALIDATION_FAILED",
        },
        fieldErrors: [
          { path: "prices.1.amountDollars", message: "Too cheap." },
        ],
      },
    });
    renderForm();
    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Add price" }));
    await user.type(screen.getByLabelText("Price 2"), "50");
    await user.type(screen.getByLabelText("Price 2 start date"), "2099-02-01");
    await user.type(screen.getByLabelText("Price 2 start time"), "09:00");
    await user.click(screen.getByRole("button", { name: "Save as draft" }));

    await screen.findByRole("heading", { name: "Validation failed" });
    expect(screen.getByLabelText("Price 2")).toHaveAccessibleDescription(
      "Too cheap.",
    );
    expect(screen.getByLabelText("Price 1")).toHaveAttribute(
      "aria-invalid",
      "false",
    );
  });
});
