import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PendingCheckoutNotice } from "./pending-checkout-notice";

const refreshSpy = vi.fn();
// Next's useRouter returns the same object on every render; the mock must too.
const router = { refresh: refreshSpy };

vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

const RECEIVED_PAYMENT_SENTENCE =
  "We've received your payment. Your access email can take a few minutes. If it hasn't arrived, look in spam, or reload this page to check again.";

describe("PendingCheckoutNotice", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    refreshSpy.mockClear();
  });

  it("shows the spinner and both sentences while pending", () => {
    render(<PendingCheckoutNotice />);

    const line = screen.getByRole("status");
    expect(line).toHaveTextContent("We're confirming your payment.");
    expect(line).toHaveTextContent("This page updates by itself.");
    expect(line.querySelector("svg")).toHaveClass("motion-safe:animate-spin");
  });

  it("refreshes the page every 5 seconds", () => {
    render(<PendingCheckoutNotice />);

    act(() => vi.advanceTimersByTime(4999));
    expect(refreshSpy).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(refreshSpy).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(5000));
    expect(refreshSpy).toHaveBeenCalledTimes(2);
  });

  it("stops checking and reads the received-payment sentence after 60 seconds", () => {
    render(<PendingCheckoutNotice />);

    act(() => vi.advanceTimersByTime(60_000));
    const checksBeforeGivingUp = refreshSpy.mock.calls.length;

    const line = screen.getByRole("status");
    expect(line).toHaveTextContent(RECEIVED_PAYMENT_SENTENCE);
    expect(line.querySelector("svg")).toBeNull();

    act(() => vi.advanceTimersByTime(30_000));
    expect(refreshSpy).toHaveBeenCalledTimes(checksBeforeGivingUp);
  });

  it("stops refreshing when the buyer leaves the page", () => {
    const { unmount } = render(<PendingCheckoutNotice />);

    unmount();
    act(() => vi.advanceTimersByTime(60_000));

    expect(refreshSpy).not.toHaveBeenCalled();
  });

  it("holds exactly one live region before and after giving up", () => {
    render(<PendingCheckoutNotice />);
    expect(screen.getAllByRole("status")).toHaveLength(1);

    act(() => vi.advanceTimersByTime(60_000));
    expect(screen.getAllByRole("status")).toHaveLength(1);
  });
});
