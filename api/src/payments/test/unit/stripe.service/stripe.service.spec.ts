import { Temporal } from "@js-temporal/polyfill";
import Stripe from "stripe";
import { describe, expect, it } from "vitest";
import { PaymentProviderUnavailableError } from "@/payments/stripe/stripe.service.js";
import {
  jsonResponse,
  serviceWith,
  makeInput,
  createdSession,
} from "@/payments/test/unit/stripe.service/stripe.service.fixtures.js";

describe("StripeService", () => {
  it("pins the Stripe API version on every request", async () => {
    const { service, requests } = serviceWith(() =>
      jsonResponse(200, createdSession),
    );

    await service.createCheckoutSession(makeInput());

    expect(requests[0]?.headers.get("Stripe-Version")).toBe(
      "2026-09-30.endive",
    );
  });

  describe("createCheckoutSession", () => {
    it("returns the session id and hosted page URL", async () => {
      const { service } = serviceWith(() => jsonResponse(200, createdSession));

      await expect(service.createCheckoutSession(makeInput())).resolves.toEqual(
        {
          id: "cs_test_123",
          url: "https://checkout.stripe.com/c/pay/cs_test_123",
        },
      );
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
          Temporal.Instant.from("2026-10-21T17:30:00Z").epochMilliseconds /
            1000,
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
    ])(
      "adds Stripe's unencoded session placeholder to %s",
      async (successUrl, separator) => {
        const { service, requests } = serviceWith(() =>
          jsonResponse(200, createdSession),
        );

        await service.createCheckoutSession({ ...makeInput(), successUrl });

        expect(requests[0].body.get("success_url")).toBe(
          `${successUrl}${separator}checkoutId={CHECKOUT_SESSION_ID}`,
        );
      },
    );

    it("reports an unreachable Stripe as unavailable", async () => {
      const { service } = serviceWith(() => {
        throw new TypeError("fetch failed");
      });

      await expect(
        service.createCheckoutSession(makeInput()),
      ).rejects.toBeInstanceOf(PaymentProviderUnavailableError);
    });

    it.each([
      [500, "api_error"],
      [429, "rate_limit_error"],
    ])("reports a %i %s from Stripe as unavailable", async (status, type) => {
      const { service } = serviceWith(() =>
        jsonResponse(status, { error: { type, message: "Try again later." } }),
      );

      await expect(
        service.createCheckoutSession(makeInput()),
      ).rejects.toBeInstanceOf(PaymentProviderUnavailableError);
    });

    it("passes a rejected request through unchanged", async () => {
      const { service } = serviceWith(() =>
        jsonResponse(400, {
          error: {
            type: "invalid_request_error",
            message: "Invalid currency: zzz",
          },
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

  describe("retrieveCheckout", () => {
    const openSession = {
      id: "cs_test_123",
      object: "checkout.session",
      status: "open",
    };

    it("fetches the session with its charge, so the payment time is known", async () => {
      const { service, requests } = serviceWith(() =>
        jsonResponse(200, openSession),
      );

      await service.retrieveCheckout("cs_test_123");

      expect(requests).toHaveLength(1);
      expect(requests[0].url).toContain("/v1/checkout/sessions/cs_test_123");
      expect(new URL(requests[0].url).searchParams.get("expand[0]")).toBe(
        "payment_intent.latest_charge",
      );
    });

    it("returns the checkout in our terms", async () => {
      const { service } = serviceWith(() => jsonResponse(200, openSession));

      await expect(service.retrieveCheckout("cs_test_123")).resolves.toEqual({
        state: "open",
      });
    });

    it("reports an unreachable Stripe as unavailable", async () => {
      const { service } = serviceWith(() => {
        throw new TypeError("fetch failed");
      });

      await expect(
        service.retrieveCheckout("cs_test_123"),
      ).rejects.toBeInstanceOf(PaymentProviderUnavailableError);
    });

    it("passes a rejected request through unchanged", async () => {
      const { service } = serviceWith(() =>
        jsonResponse(404, {
          error: {
            type: "invalid_request_error",
            code: "resource_missing",
            message: "No such checkout.session: cs_test_123",
          },
        }),
      );

      await expect(
        service.retrieveCheckout("cs_test_123"),
      ).rejects.toBeInstanceOf(Stripe.errors.StripeInvalidRequestError);
    });
  });
});
