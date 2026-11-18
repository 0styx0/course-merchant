import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SiteHeader } from "./site-header";

// usePathname returns null outside Next's router, so tests start there.
let currentPathname: string | null = null;

vi.mock("next/navigation", () => ({
  usePathname: () => currentPathname,
}));

function coursesLink() {
  return within(screen.getByRole("banner")).getByRole("link", {
    name: "Courses",
  });
}

describe("SiteHeader", () => {
  afterEach(() => {
    currentPathname = null;
  });

  it("shows the banner with a Main nav holding the wordmark and Courses links to the home page", () => {
    render(<SiteHeader />);

    const nav = within(screen.getByRole("banner")).getByRole("navigation", {
      name: "Main",
    });
    expect(
      within(nav).getByRole("link", { name: "Embodying Emptiness" }),
    ).toHaveAttribute("href", "/");
    expect(within(nav).getByRole("link", { name: "Courses" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("holds no heading, so the page keeps one h1", () => {
    render(<SiteHeader />);

    expect(
      within(screen.getByRole("banner")).queryByRole("heading"),
    ).toBeNull();
  });

  it("sticks to the top of the page", () => {
    render(<SiteHeader />);

    expect(screen.getByRole("banner")).toHaveClass(
      "sticky",
      "top-0",
      "h-14",
      "md:h-18",
    );
  });

  it("gives the Courses link and the Menu button opposite md breakpoint classes", () => {
    render(<SiteHeader />);

    const banner = screen.getByRole("banner");
    expect(within(banner).getByRole("link", { name: "Courses" })).toHaveClass(
      "hidden",
      "md:flex",
    );
    expect(
      within(banner)
        .getByRole("button", { name: "Menu" })
        .closest(".md\\:hidden"),
    ).not.toBeNull();
  });

  it("makes the header links at least 44px tall", () => {
    render(<SiteHeader />);

    for (const link of within(screen.getByRole("banner")).getAllByRole(
      "link",
    )) {
      expect(link).toHaveClass("min-h-11");
    }
  });

  it("sets the Courses link in meta size with the font-medium class", () => {
    render(<SiteHeader />);

    expect(
      within(screen.getByRole("banner")).getByRole("link", { name: "Courses" }),
    ).toHaveClass("text-meta", "font-medium");
  });

  it("marks Courses as the current page on the home page", () => {
    currentPathname = "/";
    render(<SiteHeader />);

    expect(coursesLink()).toHaveAttribute("aria-current", "page");
  });

  it("leaves Courses unmarked on a course page", () => {
    currentPathname = "/courses/x";
    render(<SiteHeader />);

    expect(coursesLink()).not.toHaveAttribute("aria-current");
  });
});
