import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AccessPill, PaidAmount, PaymentPill } from "./student-fields";

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

describe("PaidAmount", () => {
  it("shows a whole-dollar amount without cents", () => {
    render(
      <PaidAmount
        payment={{
          status: "succeeded",
          amount: 9900,
          currency: "USD",
          paidAt: "2026-11-02T15:00:00Z",
        }}
      />,
    );

    expect(screen.getByText("$99")).toBeVisible();
  });

  it("shows cents when the amount has them", () => {
    render(
      <PaidAmount
        payment={{
          status: "succeeded",
          amount: 4950,
          currency: "USD",
          paidAt: "2026-11-02T15:00:00Z",
        }}
      />,
    );

    expect(screen.getByText("$49.50")).toBeVisible();
  });

  it("keeps a non-USD currency's own symbol", () => {
    render(
      <PaidAmount
        payment={{
          status: "succeeded",
          amount: 9900,
          currency: "EUR",
          paidAt: "2026-11-02T15:00:00Z",
        }}
      />,
    );

    expect(screen.getByText("€99")).toBeVisible();
  });

  it("shows the Free pill in the secondary pair when there is no payment", () => {
    render(<PaidAmount payment={null} />);

    const pill = screen.getByText("Free");
    expect(pill).toHaveClass("bg-secondary");
    expect(pill).not.toHaveClass("bg-success");
    expect(pill).not.toHaveClass("bg-muted");
  });
});

describe("PaymentPill", () => {
  const paymentWithStatus = (
    status: "succeeded" | "refunded" | "pending" | "expired",
  ) => ({
    status,
    amount: 9900,
    currency: "USD",
    paidAt: "2026-11-02T15:00:00Z",
  });

  it("draws Paid in the green pair", () => {
    render(<PaymentPill payment={paymentWithStatus("succeeded")} />);

    expect(screen.getByText("Paid")).toHaveClass("bg-success");
  });

  it("draws Refunded in the grey pair", () => {
    render(<PaymentPill payment={paymentWithStatus("refunded")} />);

    expect(screen.getByText("Refunded")).toHaveClass("bg-muted");
  });

  it("shows a bare dash, with no pill, when there is no payment", () => {
    const { container } = render(<PaymentPill payment={null} />);

    expect(container).toHaveTextContent(/^—$/);
    expect(container.firstElementChild).toBeNull();
  });
});
