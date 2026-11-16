import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StatusPill } from "./status-pill";

describe("StatusPill", () => {
  it("shows its word", () => {
    render(<StatusPill colourPair="muted">Ended</StatusPill>);

    expect(screen.getByText("Ended")).toBeVisible();
  });

  it("reads green for the success colour pair", () => {
    render(<StatusPill colourPair="success">Published</StatusPill>);

    expect(screen.getByText("Published")).toHaveClass(
      "bg-success",
      "text-success-foreground",
    );
  });

  it("reads grey for the muted colour pair", () => {
    render(<StatusPill colourPair="muted">Draft</StatusPill>);

    expect(screen.getByText("Draft")).toHaveClass(
      "bg-muted",
      "text-muted-foreground",
    );
  });

  it("reads gold for the secondary colour pair", () => {
    render(<StatusPill colourPair="secondary">Free</StatusPill>);

    expect(screen.getByText("Free")).toHaveClass(
      "bg-secondary",
      "text-secondary-foreground",
    );
  });

  it.each(["success", "muted", "secondary"] as const)(
    "keeps the same pill shape for the %s colour pair",
    (colourPair) => {
      render(<StatusPill colourPair={colourPair}>Word</StatusPill>);

      expect(screen.getByText("Word")).toHaveClass(
        "inline-block",
        "rounded-full",
        "px-3",
        "py-1",
        "text-eyebrow",
        "uppercase",
      );
    },
  );
});
