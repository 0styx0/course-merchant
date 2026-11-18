import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { AdminHeader } from "./admin-header";

function banner() {
  return screen.getByRole("banner");
}

describe("AdminHeader", () => {
  it("shows the site name and Admin as plain text, not a link", () => {
    render(<AdminHeader />);

    const wordmark = within(banner()).getByText("Embodying Emptiness · Admin");
    expect(wordmark.closest("a")).toBeNull();
    expect(
      within(banner()).queryByRole("link", { name: /Embodying Emptiness/ }),
    ).toBeNull();
  });

  it("links to New course then Students in the Main nav", () => {
    render(<AdminHeader />);

    const nav = within(banner()).getByRole("navigation", { name: "Main" });
    const links = within(nav).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual([
      "New course",
      "Students",
    ]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/admin/courses/new",
      "/admin/students",
    ]);
  });

  it("gives the wide links and the Menu button opposite md breakpoint classes", () => {
    render(<AdminHeader />);

    for (const name of ["New course", "Students"]) {
      expect(within(banner()).getByRole("link", { name })).toHaveClass(
        "hidden",
        "md:flex",
      );
    }
    expect(
      within(banner())
        .getByRole("button", { name: "Menu" })
        .closest(".md\\:hidden"),
    ).not.toBeNull();
  });

  it("lists New course and Students in the phone sheet", async () => {
    const user = userEvent.setup();
    render(<AdminHeader />);

    await user.click(within(banner()).getByRole("button", { name: "Menu" }));

    const sheet = await screen.findByRole("dialog", { name: "Menu" });
    expect(
      within(sheet).getByRole("link", { name: "New course" }),
    ).toHaveAttribute("href", "/admin/courses/new");
    expect(
      within(sheet).getByRole("link", { name: "Students" }),
    ).toHaveAttribute("href", "/admin/students");
  });

  it("scrolls away with the page and stays out of the phone buy bar's lookup", () => {
    render(<AdminHeader />);

    expect(banner()).toHaveClass("h-14", "md:h-18", "bg-background");
    expect(banner()).not.toHaveClass("sticky");
    expect(banner()).not.toHaveAttribute("data-site-header");
  });

  it("holds no heading, so the page keeps one h1", () => {
    render(<AdminHeader />);

    expect(banner()).toBeVisible();
    expect(within(banner()).queryByRole("heading")).toBeNull();
  });

  it("makes the header links at least 44px tall", () => {
    render(<AdminHeader />);

    const links = within(banner()).getAllByRole("link");
    expect(links).toHaveLength(2);
    for (const link of links) {
      expect(link).toHaveClass("min-h-11");
    }
  });
});
