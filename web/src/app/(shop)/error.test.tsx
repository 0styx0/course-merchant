import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import ErrorPage from "./error";

describe("shop ErrorPage", () => {
  it("shows the error box with a plain message", () => {
    render(<ErrorPage error={new Error("boom")} retry={vi.fn()} />);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("We couldn't load this page");
    expect(alert).toHaveTextContent("Please try again in a moment.");
    expect(alert).not.toHaveTextContent("boom");
  });

  it("calls retry when Try again is clicked", async () => {
    const retry = vi.fn();
    render(<ErrorPage error={new Error("boom")} retry={retry} />);

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Try again" }));

    expect(retry).toHaveBeenCalledOnce();
  });
});
