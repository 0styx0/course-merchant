import { delay, http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import {
  checkoutStatusUrl,
  getCheckoutStatusHandlers,
} from "@/mocks/handlers/checkout/get-checkout-status";
import { server } from "@/mocks/server";
import { problemResponse } from "@/mocks/problem-response";
import type { ProblemDetails } from "@/lib/types";
import { getCheckoutStatus } from "./checkout-status.api";

// Its default export throws outside a React Server Component build
vi.mock("server-only", () => ({}));

// A short timeout lets the test see the abort without waiting 10 s.
vi.mock("@/lib/api/config/api-config", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/config/api-config")>()),
  API_TIMEOUT_MS: 50,
}));

describe("getCheckoutStatus", () => {
  it("asks for the checkout id it was given", async () => {
    let askedPath: string | undefined;
    server.use(
      http.get(checkoutStatusUrl, ({ request }) => {
        askedPath = new URL(request.url).pathname;
        return HttpResponse.json({ status: "succeeded" });
      }),
    );

    await getCheckoutStatus("cs_test_a1b2c3");

    expect(askedPath).toBe("/v1/checkout-sessions/cs_test_a1b2c3");
  });

  it("returns success with the status", async () => {
    server.use(getCheckoutStatusHandlers.checkoutPending);

    await expect(getCheckoutStatus("cs_test_1")).resolves.toEqual({
      state: "success",
      data: { status: "pending" },
    });
  });

  it.each([
    [404, "CHECKOUT_NOT_FOUND"],
    [500, "INTERNAL_SERVER_ERROR"],
  ])("returns the problem for a %i answer", async (status, code) => {
    const problem: ProblemDetails = { title: "Title", detail: "Detail", code };
    server.use(
      http.get(checkoutStatusUrl, () => problemResponse(status, problem)),
    );

    await expect(getCheckoutStatus("cs_test_1")).resolves.toEqual({
      state: "failure",
      error: problem,
    });
  });

  it("rejects when the API is unreachable", async () => {
    server.use(getCheckoutStatusHandlers.unreachable);

    await expect(getCheckoutStatus("cs_test_1")).rejects.toThrow(
      "Failed to fetch",
    );
  });

  it("rejects when the API answers past the timeout", async () => {
    server.use(
      http.get(checkoutStatusUrl, async () => {
        await delay(500);
        return HttpResponse.json({ status: "succeeded" });
      }),
    );

    await expect(getCheckoutStatus("cs_test_1")).rejects.toThrow();
  });
});
