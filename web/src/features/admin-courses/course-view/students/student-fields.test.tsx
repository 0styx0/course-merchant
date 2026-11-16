import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AccessPill } from "./student-fields";

describe("AccessPill", () => {
  it("draws Active in the green pair with no date", () => {
    render(
      <AccessPill
        access={{ suspendedAt: null, revokedAt: null }}
        timeZone="America/New_York"
      />,
    );

    expect(screen.getByText("Active")).toHaveClass("bg-success");
    expect(screen.getByText("Active").parentElement).toHaveTextContent(
      /^Active$/,
    );
  });

  it("dates Suspended in the course's time zone, beside the pill rather than in it", () => {
    render(
      <AccessPill
        access={{ suspendedAt: "2026-10-31T02:00:00Z", revokedAt: null }}
        timeZone="America/New_York"
      />,
    );

    expect(screen.getByText("Suspended")).toHaveClass("bg-muted");
    expect(screen.getByText("Oct 30, 2026")).not.toHaveClass("bg-muted");
  });

  it("draws Un-enrolled in the grey pair with no date", () => {
    render(
      <AccessPill
        access={{ suspendedAt: null, revokedAt: "2026-11-05T15:00:00Z" }}
        timeZone="America/New_York"
      />,
    );

    expect(screen.getByText("Un-enrolled")).toHaveClass("bg-muted");
    expect(screen.getByText("Un-enrolled").parentElement).toHaveTextContent(
      /^Un-enrolled$/,
    );
  });
});
