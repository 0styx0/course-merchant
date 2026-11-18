import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HeaderNavLink } from "./header-nav-link";

// usePathname returns null outside Next's router, so tests start there.
let currentPathname: string | null = null;

vi.mock("next/navigation", () => ({
  usePathname: () => currentPathname,
}));

const currentPagePillClasses = [
  "bg-secondary",
  "text-secondary-foreground",
  "font-semibold",
  "border-primary",
];

function renderStudentsLink() {
  render(
    <HeaderNavLink href="/admin/students" className="font-medium">
      Students
    </HeaderNavLink>,
  );
  return screen.getByRole("link", { name: "Students" });
}

describe("HeaderNavLink", () => {
  afterEach(() => {
    currentPathname = null;
  });

  it("marks the link with the gold pill when the address matches its href exactly", () => {
    currentPathname = "/admin/students";

    const link = renderStudentsLink();

    expect(link).toHaveAttribute("aria-current", "page");
    expect(link).toHaveClass(...currentPagePillClasses);
    expect(link).not.toHaveClass("font-medium");
    expect(link).not.toHaveClass("border-transparent");
  });

  it("keeps an unmarked link plain, with the pill's padding and a transparent border", () => {
    currentPathname = "/admin/courses/new";

    const link = renderStudentsLink();

    expect(link).not.toHaveAttribute("aria-current");
    expect(link).toHaveClass(
      "rounded-full",
      "border",
      "border-transparent",
      "px-4",
      "font-medium",
    );
    for (const pillClass of currentPagePillClasses) {
      expect(link).not.toHaveClass(pillClass);
    }
  });

  it("marks nothing when there is no address", () => {
    const link = renderStudentsLink();

    expect(link).not.toHaveAttribute("aria-current");
    expect(link).not.toHaveClass("bg-secondary");
  });

  it("leaves the home link unmarked on a course page", () => {
    currentPathname = "/courses/x";
    render(<HeaderNavLink href="/">Courses</HeaderNavLink>);

    const link = screen.getByRole("link", { name: "Courses" });
    expect(link).not.toHaveAttribute("aria-current");
    expect(link).not.toHaveClass("bg-secondary");
  });
});
