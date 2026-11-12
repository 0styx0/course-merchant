import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CheckoutStatusMessage } from "./checkout-status-message";

// Next's useRouter returns the same object on every render; the mock must too.
const router = { refresh: vi.fn() };

vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

const COURSE_ID = "course_react_1";

describe("CheckoutStatusMessage", () => {
  it("thanks the buyer and shows the Check your email box when the payment succeeded", () => {
    render(<CheckoutStatusMessage status="succeeded" courseId={COURSE_ID} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Thank you." }),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Check your email");
    expect(
      screen.queryByRole("link", { name: "See current courses →" }),
    ).not.toBeInTheDocument();
  });

  it("thanks the buyer and says it is confirming the payment while pending", () => {
    render(<CheckoutStatusMessage status="pending" courseId={COURSE_ID} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Thank you." }),
    ).toBeInTheDocument();
    const confirming = screen.getByRole("status");
    expect(confirming).toHaveTextContent("We're confirming your payment.");
    expect(confirming).toHaveTextContent("This page updates by itself.");
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
    "shows the heading and the sentence, and drops the course-list link, when %s",
    (status, heading, sentence) => {
      render(<CheckoutStatusMessage status={status} courseId={COURSE_ID} />);

      expect(
        screen.getByRole("heading", { level: 1, name: heading }),
      ).toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveTextContent(sentence);
      expect(
        screen.queryByRole("link", { name: "See current courses →" }),
      ).not.toBeInTheDocument();
    },
  );

  it("links a buyer whose checkout timed out back to the course with a primary Try again button", () => {
    render(<CheckoutStatusMessage status="expired" courseId={COURSE_ID} />);

    const link = screen.getByRole("link", { name: "Try again →" });
    expect(link).toHaveAttribute("href", "/courses/course_react_1");
    expect(link).toHaveClass("bg-primary");
    expect(screen.getByRole("status")).not.toContainElement(link);
    expect(
      screen.queryByRole("link", { name: "Back to the course →" }),
    ).not.toBeInTheDocument();
  });

  it("links a refunded buyer back to the course with a ghost link lined up with the text", () => {
    render(<CheckoutStatusMessage status="refunded" courseId={COURSE_ID} />);

    const link = screen.getByRole("link", { name: "Back to the course →" });
    expect(link).toHaveAttribute("href", "/courses/course_react_1");
    expect(link).toHaveClass("-ml-6");
    expect(link).not.toHaveClass("bg-primary");
    expect(screen.getByRole("status")).not.toContainElement(link);
    expect(
      screen.queryByRole("link", { name: "Try again →" }),
    ).not.toBeInTheDocument();
  });

  it.each(["succeeded", "pending"] as const)(
    "shows no link to the course when %s",
    (status) => {
      render(<CheckoutStatusMessage status={status} courseId={COURSE_ID} />);

      expect(screen.getByRole("status")).toBeInTheDocument();
      expect(screen.queryByRole("link")).not.toBeInTheDocument();
    },
  );

  it.each(["succeeded", "pending", "expired", "refunded"] as const)(
    "holds exactly one live region when %s",
    (status) => {
      render(<CheckoutStatusMessage status={status} courseId={COURSE_ID} />);

      expect(screen.getAllByRole("status")).toHaveLength(1);
    },
  );
});
