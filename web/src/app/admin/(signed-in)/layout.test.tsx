import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import AdminSignedInLayout from "./layout";

describe("AdminSignedInLayout", () => {
  it("draws the admin header before the page's content and adds no main", () => {
    render(
      <AdminSignedInLayout>
        <main>Page content</main>
      </AdminSignedInLayout>,
    );

    const banner = screen.getByRole("banner");
    const pageMain = screen.getByRole("main");
    expect(banner.compareDocumentPosition(pageMain)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(screen.getAllByRole("main")).toHaveLength(1);
  });
});
