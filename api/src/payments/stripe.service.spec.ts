import { Temporal } from "@js-temporal/polyfill";
import Stripe from "stripe";
import { describe, expect, it, vi } from "vitest";

import {
  PaymentProviderUnavailableError,
  StripeService,
  type CreateCheckoutSessionInput,
} from "./stripe.service.js";

type StripeRequest = {
  url: string;
  headers: Headers;
  body: URLSearchParams;
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// a real Stripe client whose HTTP calls go to `respond` instead of the network
function serviceWith(respond: (request: StripeRequest) => Response | Promise<Response>) {
  const requests: StripeRequest[] = [];

  const fetchFn = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const request = {
      url: String(url),
      headers: new Headers(init?.headers),
      body: new URLSearchParams(String(init?.body ?? "")),
    };

    requests.push(request);

    return respond(request);
  });

  const stripe = new Stripe("sk_test_unit", {
    httpClient: Stripe.createFetchHttpClient(fetchFn as typeof fetch),
    maxNetworkRetries: 0,
  });

  return { service: new StripeService(stripe), requests };
}

function makeInput(): CreateCheckoutSessionInput {
  return {
    paymentId: "9f1c2d3e-0000-4000-8000-000000000001",
    amount: 9900,
    currency: "USD",
    courseName: "React Fundamentals",
    customerEmail: "ada@example.com",
    successUrl: "https://courses.example.com/checkout/success",
    cancelUrl: "https://courses.example.com/courses/123",
    expiresAt: Temporal.Instant.from("2026-10-21T17:30:00Z"),
  };
}

const createdSession = {
  id: "cs_test_123",
  object: "checkout.session",
  url: "https://checkout.stripe.com/c/pay/cs_test_123",
};

describe("StripeService", () => {
  describe("createCheckoutSession", () => {
    it("returns the session id and hosted page URL", async () => {
      const { service } = serviceWith(() => jsonResponse(200, createdSession));

      await expect(service.createCheckoutSession(makeInput())).resolves.toEqual({
        id: "cs_test_123",
        url: "https://checkout.stripe.com/c/pay/cs_test_123",
      });
    });

    it("creates a one-off card payment for the course price", async () => {
      const { service, requests } = serviceWith(() =>
        jsonResponse(200, createdSession),
      );

      await service.createCheckoutSession(makeInput());

      expect(requests).toHaveLength(1);
      expect(requests[0].url).toMatch(/\/v1\/checkout\/sessions$/);
      expect(Object.fromEntries(requests[0].body)).toMatchObject({
        mode: "payment",
        "allowed_payment_method_types[0]": "card",
        "line_items[0][quantity]": "1",
        "line_items[0][price_data][currency]": "usd",
        "line_items[0][price_data][unit_amount]": "9900",
        "line_items[0][price_data][product_data][name]": "React Fundamentals",
        customer_email: "ada@example.com",
        client_reference_id: "9f1c2d3e-0000-4000-8000-000000000001",
        "metadata[paymentId]": "9f1c2d3e-0000-4000-8000-000000000001",
        cancel_url: "https://courses.example.com/courses/123",
        expires_at: String(
          Temporal.Instant.from("2026-10-21T17:30:00Z").epochMilliseconds / 1000,
        ),
      });
    });

    it("keys the request by payment id so retries reuse the session", async () => {
      const { service, requests } = serviceWith(() =>
        jsonResponse(200, createdSession),
      );

      await service.createCheckoutSession(makeInput());

      expect(requests[0].headers.get("Idempotency-Key")).toBe(
        "checkout-9f1c2d3e-0000-4000-8000-000000000001",
      );
    });

    it.each([
      ["https://courses.example.com/checkout/success", "?"],
      ["https://courses.example.com/checkout/success?course=123", "&"],
    ])("adds Stripe's unencoded session placeholder to %s", async (successUrl, separator) => {
      const { service, requests } = serviceWith(() =>
        jsonResponse(200, createdSession),
      );

      await service.createCheckoutSession({ ...makeInput(), successUrl });

      expect(requests[0].body.get("success_url")).toBe(
        `${successUrl}${separator}checkoutId={CHECKOUT_SESSION_ID}`,
      );
    });

    it("reports an unreachable Stripe as unavailable", async () => {
      const { service } = serviceWith(() => {
        throw new TypeError("fetch failed");
      });

      await expect(service.createCheckoutSession(makeInput())).rejects.toBeInstanceOf(
        PaymentProviderUnavailableError,
      );
    });

    it.each([
      [500, "api_error"],
      [429, "rate_limit_error"],
    ])("reports a %i %s from Stripe as unavailable", async (status, type) => {
      const { service } = serviceWith(() =>
        jsonResponse(status, { error: { type, message: "Try again later." } }),
      );

      await expect(service.createCheckoutSession(makeInput())).rejects.toBeInstanceOf(
        PaymentProviderUnavailableError,
      );
    });

    it("passes a rejected request through unchanged", async () => {
      const { service } = serviceWith(() =>
        jsonResponse(400, {
          error: { type: "invalid_request_error", message: "Invalid currency: zzz" },
        }),
      );

      const result = service.createCheckoutSession(makeInput());

      await expect(result).rejects.toBeInstanceOf(
        Stripe.errors.StripeInvalidRequestError,
      );
    });

    it("fails loudly if Stripe returns a session without a URL", async () => {
      const { service } = serviceWith(() =>
        jsonResponse(200, { ...createdSession, url: null }),
      );

      await expect(service.createCheckoutSession(makeInput())).rejects.toThrow(
        "Stripe returned Checkout Session cs_test_123 without a URL.",
      );
    });
  });
});
