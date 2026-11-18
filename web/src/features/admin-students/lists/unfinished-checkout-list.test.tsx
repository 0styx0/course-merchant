import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { AdminCustomer } from "@/lib/types";
import { UnfinishedCheckoutList } from "./unfinished-checkout-list";

function makeUnfinishedCustomer(
  name: string,
  latestCheckoutStartedAt: string | null,
): AdminCustomer {
  return {
    id: `id-${name}`,
    name,
    email: `${name.toLowerCase()}@example.com`,
    latestCheckoutStartedAt,
    enrollments: [],
  };
}

describe("UnfinishedCheckoutList", () => {
  it("counts the customers and says they never paid, in grey", () => {
    render(
      <UnfinishedCheckoutList
        customers={[
          makeUnfinishedCustomer("Tal", "2026-11-03T16:00:00Z"),
          makeUnfinishedCustomer("Moe", "2026-10-01T09:00:00Z"),
        ]}
      />,
    );

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Unfinished checkouts (2)",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Started a checkout and never paid.")).toHaveClass(
      "text-muted-foreground",
    );
  });

  it("reads each row as name, email and the checkout day in the browser's zone", () => {
    render(
      <UnfinishedCheckoutList
        customers={[
          makeUnfinishedCustomer("Tal", "2026-11-03T16:00:00Z"),
          makeUnfinishedCustomer("Moe", "2026-10-01T09:00:00Z"),
        ]}
      />,
    );

    // 16:00 UTC on Nov 3 is already Nov 4 in Pacific/Chatham, the test zone.
    const rows = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(rows.map((row) => row.textContent)).toEqual([
      "Tal · tal@example.com · Nov 4, 2026",
      "Moe · moe@example.com · Oct 1, 2026",
    ]);
  });

  it("shows no date for a customer with no checkout time", () => {
    render(
      <UnfinishedCheckoutList
        customers={[makeUnfinishedCustomer("Tal", null)]}
      />,
    );

    const row = within(screen.getByRole("list")).getByRole("listitem");
    expect(row.textContent).toBe("Tal · tal@example.com");
  });

  it("renders nothing for nobody", () => {
    const { container } = render(<UnfinishedCheckoutList customers={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
