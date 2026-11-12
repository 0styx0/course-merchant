import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { GhostArrowLink } from "./ghost-arrow-link";

describe("GhostArrowLink", () => {
  it("links to the address with the label it was given", () => {
    render(<GhostArrowLink href="/courses/abc">Back →</GhostArrowLink>);

    expect(screen.getByRole("link", { name: "Back →" })).toHaveAttribute(
      "href",
      "/courses/abc",
    );
  });

  it("pulls the label left by the button's padding so it lines up with the text above", () => {
    render(<GhostArrowLink href="/">Back →</GhostArrowLink>);

    expect(screen.getByRole("link", { name: "Back →" })).toHaveClass(
      "-ml-6",
      "justify-start",
    );
  });

  it("keeps a class passed by the caller", () => {
    render(
      <GhostArrowLink href="/" className="mt-4">
        Back →
      </GhostArrowLink>,
    );

    expect(screen.getByRole("link", { name: "Back →" })).toHaveClass(
      "mt-4",
      "-ml-6",
    );
  });
});
