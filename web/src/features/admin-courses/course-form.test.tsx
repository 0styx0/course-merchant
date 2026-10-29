import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { JSONContent } from "@tiptap/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CreateCourseActionResult } from "./create-course.action";
import { createCourseAction } from "./create-course.action";
import { CourseForm } from "./course-form";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("./create-course.action", () => ({ createCourseAction: vi.fn() }));

// Typing into Tiptap is unreliable in jsdom (the browser test covers it), so
// the editor is a button that fills in a description.
vi.mock("./description-editor", () => ({
  DescriptionEditor: ({
    onChange,
    fieldRef,
    error,
  }: {
    onChange: (description: JSONContent) => void;
    fieldRef: (handle: { focus: () => void } | null) => void;
    error?: string;
  }) => (
    <div>
      <button
        type="button"
        onClick={() =>
          onChange({
            type: "doc",
            content: [
              { type: "paragraph", content: [{ type: "text", text: "Hello" }] },
            ],
          })
        }
        ref={(element) => fieldRef(element && { focus: () => element.focus() })}
      >
        Fill description
      </button>
      {error && <p>Description problem: {error}</p>}
    </div>
  ),
}));

const action = vi.mocked(createCourseAction);

// Each field's own message is also an alert, so find the list by its heading.
function summaryWithHeading(name: RegExp | string) {
  const summary = screen.getByRole("heading", { name }).closest("[role=alert]");
  if (!(summary instanceof HTMLElement)) throw new Error("No error list");
  return summary;
}

function renderForm() {
  return render(
    <CourseForm timeZones={["America/New_York", "Europe/Paris"]} />,
  );
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
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

beforeEach(() => {
  vi.clearAllMocks();
});

describe("CourseForm", () => {
  it("groups the fields into named sections", () => {
    renderForm();

    for (const title of ["Basics", "Content", "Schedule", "Pricing"]) {
      expect(screen.getByRole("group", { name: title })).toBeInTheDocument();
    }
    expect(screen.getByRole("group", { name: "Pricing" })).toContainElement(
      screen.getByLabelText("Price"),
    );
  });

  it("explains the empty price start once for all price rows", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole("button", { name: "Add price" }));

    expect(screen.getAllByText(/Leave the date and time empty/)).toHaveLength(
      1,
    );
  });

  it("counts the name and summary, red past the limit", async () => {
    const user = userEvent.setup();
    renderForm();

    expect(screen.getByLabelText("Course name")).toHaveAccessibleDescription(
      "0 / 100",
    );
    await user.type(screen.getByLabelText("Course name"), "abc");
    expect(screen.getByText("3 / 100")).not.toHaveClass("text-destructive");

    await user.click(screen.getByLabelText("Summary"));
    await user.paste("x".repeat(301));
    expect(screen.getByText("301 / 300")).toHaveClass("text-destructive");
  });

  it("shows a message and marks the field invalid when an empty field loses focus", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByLabelText("Course name"));
    await user.tab();

    const name = screen.getByLabelText("Course name");
    expect(name).toHaveAttribute("aria-invalid", "true");
    expect(name).toHaveAccessibleDescription("0 / 100 Enter a course name.");
  });

  it("clears the message as the admin fixes the field", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByLabelText("Course name"));
    await user.tab();
    await user.type(screen.getByLabelText("Course name"), "A");

    expect(screen.getByLabelText("Course name")).toHaveAttribute(
      "aria-invalid",
      "false",
    );
    expect(screen.queryByText("Enter a course name.")).not.toBeInTheDocument();
  });

  it("shows no message on an end time the admin has not reached", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("Start date"), "2099-01-10");
    await user.type(screen.getByLabelText("Start time"), "09:00");

    expect(screen.getByLabelText("End time")).toHaveAttribute(
      "aria-invalid",
      "false",
    );
  });

  it("shows the course length once both times are valid", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("Start date"), "2099-01-10");
    await user.type(screen.getByLabelText("Start time"), "09:00");
    await user.type(screen.getByLabelText("End date"), "2099-01-10");
    await user.type(screen.getByLabelText("End time"), "11:30");

    expect(screen.getByText("Lasts 2 hours 30 minutes")).toBeInTheDocument();
  });

  it("lists every problem and focuses the list when submitted invalid", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole("button", { name: "Save as draft" }));

    await screen.findByRole("heading", { name: /^Fix \d+ problems/ });
    const summary = summaryWithHeading(/^Fix \d+ problems/);
    expect(summary).toHaveFocus();
    expect(summary).toHaveTextContent("Enter a course name.");
    expect(summary).toHaveTextContent("Enter a description.");
    expect(summary).toHaveTextContent("Enter a price, like 79.50.");
    expect(action).not.toHaveBeenCalled();
  });

  it("focuses a field from its link in the list", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole("button", { name: "Save as draft" }));

    await user.click(await screen.findByRole("button", { name: "Summary" }));

    expect(screen.getByLabelText("Summary")).toHaveFocus();
  });

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

  it("adds and removes price rows, numbering them only when there are several", async () => {
    const user = userEvent.setup();
    renderForm();
    expect(screen.getByRole("button", { name: "Remove price" })).toBeDisabled();

    await user.type(screen.getByLabelText("Price"), "10");
    await user.click(screen.getByRole("button", { name: "Add price" }));

    expect(screen.getByLabelText("Price 1")).toHaveValue("10");
    expect(screen.getByLabelText("Price 2")).toHaveValue("");
    expect(screen.getByLabelText("Price 2 start date")).toHaveValue("");

    await user.type(screen.getByLabelText("Price 2"), "20");
    await user.click(screen.getByRole("button", { name: "Remove price 1" }));

    expect(screen.getByLabelText("Price")).toHaveValue("20");
    expect(screen.queryByLabelText("Price 2")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove price" })).toBeDisabled();
  });

  it("lists a problem on a later price row with its number and focuses it", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole("button", { name: "Add price" }));
    await user.click(screen.getByRole("button", { name: "Save as draft" }));

    await user.click(await screen.findByRole("button", { name: "Price 2" }));

    expect(screen.getByLabelText("Price 2")).toHaveFocus();
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
