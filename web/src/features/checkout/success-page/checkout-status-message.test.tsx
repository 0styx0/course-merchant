import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CheckoutStatusMessage } from "./checkout-status-message";

describe("CheckoutStatusMessage", () => {
  it("thanks the buyer and shows the Check your email box when the payment succeeded", () => {
    render(<CheckoutStatusMessage status="succeeded" />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Thank you." }),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Check your email");
    expect(
      screen.queryByRole("link", { name: "See current courses →" }),
    ).not.toBeInTheDocument();
  });

  it("thanks the buyer and says it is confirming the payment while pending", () => {
    render(<CheckoutStatusMessage status="pending" />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Thank you." }),
    ).toBeInTheDocument();
    const confirming = screen.getByRole("status");
    expect(confirming).toHaveTextContent("We're confirming your payment.");
    expect(confirming.querySelector("svg")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(confirming.querySelector("svg")).toHaveClass(
      "motion-safe:animate-spin",
    );
    expect(
      screen.queryByRole("link", { name: "See current courses →" }),
    ).not.toBeInTheDocument();
  });

  it.each([
    [
      "expired",
      "Checkout timed out.",
      "This checkout ended before payment, so we charged you nothing.",
    ],
    [
      "refunded",
      "Payment refunded.",
      "We've refunded this payment. It can take a few days to appear on your statement.",
    ],
  ] as const)(
    "tells the buyer what happened and links to the courses when %s",
    (status, heading, sentence) => {
      render(<CheckoutStatusMessage status={status} />);

      expect(
        screen.getByRole("heading", { level: 1, name: heading }),
      ).toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveTextContent(sentence);
      const link = screen.getByRole("link", { name: "See current courses →" });
      expect(link).toHaveAttribute("href", "/");
      expect(screen.getByRole("status")).not.toContainElement(link);
    },
  );

  it.each(["succeeded", "pending", "expired", "refunded"] as const)(
    "holds exactly one live region when %s",
    (status) => {
      render(<CheckoutStatusMessage status={status} />);

      expect(screen.getAllByRole("status")).toHaveLength(1);
    },
  );
});
