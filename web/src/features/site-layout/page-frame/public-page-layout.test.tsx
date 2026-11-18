import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PublicPageLayout } from "./public-page-layout";

describe("PublicPageLayout", () => {
  it("renders banner, main and contentinfo landmarks around its children", () => {
    render(
      <PublicPageLayout>
        <p>Page content</p>
      </PublicPageLayout>,
    );

    const banner = screen.getByRole("banner");
    const main = screen.getByRole("main");
    const contentinfo = screen.getByRole("contentinfo");
    expect(banner.compareDocumentPosition(main)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(main.compareDocumentPosition(contentinfo)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(
      within(screen.getByRole("main")).getByText("Page content"),
    ).toBeInTheDocument();
  });
});
