import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SITE_NAME } from "@/lib/site-config/site-name";

import { SiteFooter } from "./site-footer";

describe("SiteFooter", () => {
  it("shows the contentinfo with a Footer nav holding the wordmark and Courses links to the home page", () => {
    render(<SiteFooter />);

    const nav = within(screen.getByRole("contentinfo")).getByRole(
      "navigation",
      { name: "Footer" },
    );
    expect(within(nav).getByRole("link", { name: SITE_NAME })).toHaveAttribute(
      "href",
      "/",
    );
    expect(within(nav).getByRole("link", { name: "Courses" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("greys the links and darkens them on hover", () => {
    render(<SiteFooter />);

    for (const link of within(screen.getByRole("contentinfo")).getAllByRole(
      "link",
    )) {
      expect(link).toHaveClass(
        "text-muted-foreground",
        "hover:text-foreground",
      );
    }
  });

  it("makes both links at least 44px tall", () => {
    render(<SiteFooter />);

    for (const link of within(screen.getByRole("contentinfo")).getAllByRole(
      "link",
    )) {
      expect(link).toHaveClass("min-h-11");
    }
  });
});
