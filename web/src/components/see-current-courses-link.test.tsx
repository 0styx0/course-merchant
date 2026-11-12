import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SeeCurrentCoursesLink } from "./see-current-courses-link";

describe("SeeCurrentCoursesLink", () => {
  it("pulls the label left by the button's padding so it lines up with the text above", () => {
    render(<SeeCurrentCoursesLink />);

    expect(
      screen.getByRole("link", { name: "See current courses →" }),
    ).toHaveClass("-ml-6", "justify-start");
  });

  it("keeps a class passed by the caller", () => {
    render(<SeeCurrentCoursesLink className="mt-4" />);

    expect(
      screen.getByRole("link", { name: "See current courses →" }),
    ).toHaveClass("mt-4", "-ml-6");
  });
});
