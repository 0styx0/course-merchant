import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SeeCurrentCoursesLink } from "./see-current-courses-link";

describe("SeeCurrentCoursesLink", () => {
  it("links to the home page with its label", () => {
    render(<SeeCurrentCoursesLink />);

    expect(
      screen.getByRole("link", { name: "See current courses →" }),
    ).toHaveAttribute("href", "/");
  });

  it("keeps a class passed by the caller", () => {
    render(<SeeCurrentCoursesLink className="mt-4" />);

    expect(
      screen.getByRole("link", { name: "See current courses →" }),
    ).toHaveClass("mt-4");
  });
});
