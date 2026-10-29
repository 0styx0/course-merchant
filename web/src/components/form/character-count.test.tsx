import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CharacterCount } from "./character-count";

describe("CharacterCount", () => {
  it("shows the count and the limit", () => {
    render(<CharacterCount count={1234} limit={5000} />);
    expect(screen.getByText("1,234 / 5,000")).not.toHaveClass(
      "text-destructive",
    );
  });

  it("stays at the limit without turning red", () => {
    render(<CharacterCount count={100} limit={100} />);
    expect(screen.getByText("100 / 100")).not.toHaveClass("text-destructive");
  });

  it("turns red over the limit", () => {
    render(<CharacterCount count={101} limit={100} />);
    expect(screen.getByText("101 / 100")).toHaveClass("text-destructive");
  });
});
