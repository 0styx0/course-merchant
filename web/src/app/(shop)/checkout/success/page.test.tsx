import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { getCheckoutStatusHandlers } from "@/mocks/handlers/get-checkout-status";
import { server } from "@/mocks/node";
import CheckoutSuccessPage, { metadata } from "./page";

// Its default export throws outside a React Server Component build
vi.mock("server-only", () => ({}));

const NOT_FOUND_DIGEST = "NEXT_HTTP_ERROR_FALLBACK;404";

async function renderPage(checkoutId: string | string[] | undefined) {
  const page = await CheckoutSuccessPage({
    searchParams: Promise.resolve({ checkoutId }),
  });
  render(page);
}

describe("CheckoutSuccessPage", () => {
  it("asks search engines not to index the page", () => {
    expect(metadata.robots).toEqual({ index: false });
  });

  it("thanks the buyer and names no address when the payment succeeded", async () => {
    server.use(getCheckoutStatusHandlers.success);

    await renderPage("cs_test_1");

    expect(
      screen.getByRole("heading", { level: 1, name: "Thank you." }),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "We've sent access to the email address you entered.",
    );
  });

  it.each([
    ["checkoutPending", "Thank you."],
    ["checkoutExpired", "Checkout timed out."],
    ["checkoutRefunded", "Payment refunded."],
  ] as const)(
    "shows the words for the %s status",
    async (scenario, heading) => {
      server.use(getCheckoutStatusHandlers[scenario]);

      await renderPage("cs_test_1");

      expect(
        screen.getByRole("heading", { level: 1, name: heading }),
      ).toBeInTheDocument();
      expect(screen.getAllByRole("status")).toHaveLength(1);
    },
  );

  it.each([
    ["missing", undefined],
    ["empty", ""],
    ["repeated", ["cs_test_1", "cs_test_2"]],
    ["the current folder", "."],
    ["the parent folder", ".."],
  ])(
    "shows not-found without a request when the id is %s",
    async (_name, checkoutId) => {
      // Vitest fails on an unhandled request, so no handler proves none is sent.
      server.resetHandlers();

      await expect(renderPage(checkoutId)).rejects.toThrow(NOT_FOUND_DIGEST);
    },
  );

  it("shows not-found when the API answers 404", async () => {
    server.use(getCheckoutStatusHandlers.checkoutNotFound);

    await expect(renderPage("cs_test_1")).rejects.toThrow(NOT_FOUND_DIGEST);
  });

  it("shows the API's words when it answers 500", async () => {
    server.use(getCheckoutStatusHandlers.checkoutServerError);

    await renderPage("cs_test_1");

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Internal server error");
    expect(alert).toHaveTextContent(
      "Something went wrong on our side. Please try again later.",
    );
  });

  it("lets the shop error page handle an unreachable API", async () => {
    server.use(getCheckoutStatusHandlers.unreachable);

    await expect(renderPage("cs_test_1")).rejects.toThrow("Failed to fetch");
  });
});
