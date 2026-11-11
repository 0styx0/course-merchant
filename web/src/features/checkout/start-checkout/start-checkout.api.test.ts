import { delay, http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { server } from "@/mocks/server";
import {
  startCheckoutCheckEmail,
  startCheckoutUrl,
} from "@/mocks/handlers/checkout/start-checkout";
import { problemResponse } from "@/mocks/problem-response";
import type { ProblemDetails } from "@/lib/types";
import { startCheckout } from "./start-checkout.api";

// Its default export throws outside a React Server Component build
vi.mock("server-only", () => ({}));

// A short timeout lets the test see the abort without waiting 10 s.
vi.mock("@/lib/api/config/api-config", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/config/api-config")>()),
  API_TIMEOUT_MS: 50,
}));

const courseId = "11111111-1111-4111-8111-111111111111";
const customer = { name: "Ada Lovelace", email: "ada@example.com" };

describe("startCheckout", () => {
  it("sends the course id and the customer as given", async () => {
    let sentBody: unknown;
    server.use(
      http.post(startCheckoutUrl, async ({ request }) => {
        sentBody = await request.json();
        return HttpResponse.json({ status: "check_email" });
      }),
    );

    await startCheckout(courseId, { name: "  Ada ", email: "ADA@example.com" });

    expect(sentBody).toEqual({
      courseId,
      customer: { name: "  Ada ", email: "ADA@example.com" },
    });
  });

  it("returns success for a check_email answer", async () => {
    server.use(startCheckoutCheckEmail);

    await expect(startCheckout(courseId, customer)).resolves.toEqual({
      state: "success",
      data: { status: "check_email" },
    });
  });

  it("returns success for a redirect answer", async () => {
    const redirect = {
      status: "redirect",
      url: "https://checkout.stripe.com/c/pay/cs_test_1",
    };
    server.use(http.post(startCheckoutUrl, () => HttpResponse.json(redirect)));

    await expect(startCheckout(courseId, customer)).resolves.toEqual({
      state: "success",
      data: redirect,
    });
  });

  it.each([
    [400, "VALIDATION_FAILED"],
    [404, "COURSE_NOT_FOUND"],
    [409, "COURSE_NOT_PURCHASABLE"],
    [500, "INTERNAL_SERVER_ERROR"],
    [503, "PAYMENT_PROVIDER_UNAVAILABLE"],
  ])("returns the problem for a %i answer", async (status, code) => {
    const problem: ProblemDetails = { title: "Title", detail: "Detail", code };
    server.use(
      http.post(startCheckoutUrl, () => problemResponse(status, problem)),
    );

    await expect(startCheckout(courseId, customer)).resolves.toEqual({
      state: "failure",
      error: problem,
    });
  });

  it("rejects when the API is unreachable", async () => {
    server.use(http.post(startCheckoutUrl, () => HttpResponse.error()));

    await expect(startCheckout(courseId, customer)).rejects.toThrow(
      "Failed to fetch",
    );
  });

  it("rejects when the API answers past the timeout", async () => {
    server.use(
      http.post(startCheckoutUrl, async () => {
        await delay(500);
        return HttpResponse.json({ status: "check_email" });
      }),
    );

    await expect(startCheckout(courseId, customer)).rejects.toThrow();
  });
});
