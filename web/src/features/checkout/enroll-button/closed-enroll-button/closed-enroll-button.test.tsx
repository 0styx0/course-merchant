import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ClosedEnrollButton } from "./closed-enroll-button";

const LABEL = "Enroll for $99";

function renderClosedButton(onOpen = vi.fn()) {
  render(
    <ClosedEnrollButton label={LABEL} onOpen={onOpen} note={<p>The note</p>} />,
  );
  return screen.getByRole("button", { name: LABEL });
}

describe("ClosedEnrollButton", () => {
  it("shows the closed button and the note with no bar at first", () => {
    const button = renderClosedButton();

    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveClass("w-full");
    expect(screen.getByText("The note")).toBeVisible();
    expect(screen.getAllByRole("button", { name: LABEL })).toHaveLength(1);
  });
});
