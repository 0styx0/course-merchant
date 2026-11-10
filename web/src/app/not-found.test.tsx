import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import UnknownUrlNotFound, { metadata } from "./not-found";

describe("UnknownUrlNotFound", () => {
  it("shows the header, the Page not found message and the footer", () => {
    render(<UnknownUrlNotFound />);

    expect(screen.getByRole("banner")).toBeInTheDocument();
    const main = screen.getByRole("main");
    expect(
      within(main).getByRole("heading", { level: 1, name: "Page not found" }),
    ).toBeInTheDocument();
    expect(
      within(main).getByText(
        "This page doesn't exist. The link may have a typo, or the page has moved.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });

  it("names the tab Page not found, for the root title template", () => {
    expect(metadata.title).toBe("Page not found");
  });
});
