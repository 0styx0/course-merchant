import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { UnenrollDialog, type UnenrollDialogProps } from "./unenroll-dialog";

function renderDialog(overrides: Partial<UnenrollDialogProps> = {}) {
  const props: UnenrollDialogProps = {
    studentName: "Dana Cohen",
    isPaid: true,
    isOpen: true,
    isPending: false,
    problem: null,
    onKeepStudent: vi.fn(),
    onConfirm: vi.fn(),
    ...overrides,
  };
  render(<UnenrollDialog {...props} />);
  return props;
}

function dialog() {
  return screen.getByRole("alertdialog", { name: "Un-enroll Dana Cohen?" });
}

describe("UnenrollDialog", () => {
  it("tells the admin to refund a paid student in Stripe first", () => {
    renderDialog();

    expect(dialog()).toHaveTextContent(
      "Refund their payment in Stripe first. Un-enrolling removes their access to the course and marks the payment Refunded; it doesn't contact Stripe.",
    );
  });

  it("says only that access ends for a free student", () => {
    renderDialog({ isPaid: false });

    expect(dialog()).toHaveAccessibleDescription(
      "Un-enrolling removes their access to the course.",
    );
  });

  it("offers Keep student and Un-enroll", () => {
    renderDialog();

    expect(screen.getByRole("button", { name: "Keep student" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Un-enroll" })).toBeEnabled();
  });

  it("runs onConfirm when Un-enroll is clicked", async () => {
    const user = userEvent.setup();
    const props = renderDialog();

    await user.click(screen.getByRole("button", { name: "Un-enroll" }));

    expect(props.onConfirm).toHaveBeenCalledOnce();
  });

  it("runs onKeepStudent on Keep student", async () => {
    const user = userEvent.setup();
    const props = renderDialog();

    await user.click(screen.getByRole("button", { name: "Keep student" }));

    expect(props.onKeepStudent).toHaveBeenCalledOnce();
  });

  it("runs onKeepStudent on Escape", async () => {
    const user = userEvent.setup();
    const props = renderDialog();

    await user.keyboard("{Escape}");

    expect(props.onKeepStudent).toHaveBeenCalledOnce();
  });

  it("reads Un-enrolling… and disables both buttons while pending", () => {
    renderDialog({ isPending: true });

    expect(
      screen.getByRole("button", { name: "Un-enrolling…" }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Keep student" })).toBeDisabled();
  });

  it("ignores Escape while pending", async () => {
    const user = userEvent.setup();
    const props = renderDialog({ isPending: true });

    await user.keyboard("{Escape}");

    expect(props.onKeepStudent).not.toHaveBeenCalled();
    expect(dialog()).toBeInTheDocument();
  });

  it("shows the problem's title and detail inside the dialog", () => {
    renderDialog({
      problem: { title: "Enrollment not found", detail: "No such student." },
    });

    const alert = screen.getByRole("alert");
    expect(dialog()).toContainElement(alert);
    expect(alert).toHaveTextContent("Enrollment not found");
    expect(alert).toHaveTextContent("No such student.");
  });

  it("shows no alert without a problem", () => {
    renderDialog();

    expect(screen.queryByRole("alert")).toBeNull();
  });
});
