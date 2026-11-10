import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { buttonVariants } from "@/components/ui/button";

import { NotFoundMessage } from "./not-found-message";

describe("NotFoundMessage", () => {
  it("shows the title as the page's h1", () => {
    render(<NotFoundMessage title="Page not found" detail="Gone." />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Page not found" }),
    ).toBeInTheDocument();
  });

  it("shows the detail sentence", () => {
    render(<NotFoundMessage title="Page not found" detail="Gone." />);

    expect(screen.getByText("Gone.")).toBeInTheDocument();
  });

  it("links to the courses with a ghost button look", () => {
    render(<NotFoundMessage title="Page not found" detail="Gone." />);

    const link = screen.getByRole("link", { name: "See current courses →" });
    expect(link).toHaveAttribute("href", "/");
    expect(link).toHaveClass(
      ...buttonVariants({ variant: "ghost" }).split(" "),
    );
  });
});
