import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { getCheckoutStatusHandlers } from "@/mocks/handlers/checkout/get-checkout-status";
import { server } from "@/mocks/server";
import CheckoutSuccessPage, { generateMetadata } from "./page";

// Its default export throws outside a React Server Component build
vi.mock("server-only", () => ({}));

// Next's useRouter returns the same object on every render; the mock must too.
const router = { refresh: vi.fn() };

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => router,
}));

const NOT_FOUND_DIGEST = "NEXT_HTTP_ERROR_FALLBACK;404";

function readMetadata(checkoutId: string | undefined) {
  return generateMetadata({
    searchParams: Promise.resolve({ checkoutId }),
  });
}

async function renderPage(checkoutId: string | string[] | undefined) {
  const page = await CheckoutSuccessPage({
    searchParams: Promise.resolve({ checkoutId }),
  });
  render(page);
}

describe("CheckoutSuccessPage", () => {
  it("names the tab Thank you and asks search engines not to index the page", async () => {
    server.use(getCheckoutStatusHandlers.success);

    expect(await readMetadata("cs_test_1")).toEqual({
      title: "Thank you",
      robots: { index: false },
    });
  });

  it.each([
    ["checkoutPending", "Thank you"],
    ["checkoutExpired", "Checkout timed out"],
    ["checkoutRefunded", "Payment refunded"],
  ] as const)(
    "shows the tab title of the %s outcome",
    async (scenario, title) => {
      server.use(getCheckoutStatusHandlers[scenario]);

      expect(await readMetadata("cs_test_1")).toEqual({
        title,
        robots: { index: false },
      });
    },
  );

  it("keeps the thanks in the tab when the API answers 500", async () => {
    server.use(getCheckoutStatusHandlers.checkoutServerError);

    expect(await readMetadata("cs_test_1")).toEqual({
      title: "Thank you",
      robots: { index: false },
    });
  });

  it("names the tab Checkout not found when the API answers 404", async () => {
    server.use(getCheckoutStatusHandlers.checkoutNotFound);

    expect(await readMetadata("cs_test_unknown")).toEqual({
      title: "Checkout not found",
      robots: { index: false },
    });
  });

  it("names the tab Checkout not found when the link has no checkout id", async () => {
    expect(await readMetadata(undefined)).toEqual({
      title: "Checkout not found",
      robots: { index: false },
    });
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

  it("shows the pending words without a link back to the courses", async () => {
    server.use(getCheckoutStatusHandlers.checkoutPending);

    await renderPage("cs_test_1");

    expect(
      screen.getByRole("heading", { level: 1, name: "Thank you." }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(screen.getByRole("status")).toHaveTextContent(
      "We're confirming your payment.",
    );
  });

  it.each([
    ["checkoutExpired", "Checkout timed out.", "charged you nothing"],
    ["checkoutRefunded", "Payment refunded.", "We've refunded this payment."],
  ] as const)(
    "shows the words and a link to the courses for the %s status",
    async (scenario, heading, sentence) => {
      server.use(getCheckoutStatusHandlers[scenario]);

      await renderPage("cs_test_1");

      expect(
        screen.getByRole("heading", { level: 1, name: heading }),
      ).toBeInTheDocument();
      expect(screen.getAllByRole("status")).toHaveLength(1);
      expect(screen.getByRole("status")).toHaveTextContent(sentence);
      expect(
        screen.getByRole("link", { name: "See current courses →" }),
      ).toHaveAttribute("href", "/");
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
