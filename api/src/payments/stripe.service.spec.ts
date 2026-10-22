import { Temporal } from "@js-temporal/polyfill";
import Stripe from "stripe";
import { describe, expect, it, vi } from "vitest";

import type { PaymentsConfig } from "@/config/payments-config.js";
import {
  completedCheckoutFromEvent,
  InvalidWebhookSignatureError,
  PaymentProviderUnavailableError,
  StripeService,
  type CreateCheckoutSessionInput,
  type RefundPaymentInput,
} from "./stripe.service.js";

const config: PaymentsConfig = {
  stripeSecretKey: "sk_test_unit",
  stripeWebhookSecret: "whsec_unit_test_secret",
  webBaseUrl: "https://courses.example.com",
};

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
function serviceWith(
  respond: (request: StripeRequest) => Response | Promise<Response>,
) {
  const requests: StripeRequest[] = [];

  const fetchFn = vi.fn(
    async (url: string | URL | Request, init?: RequestInit) => {
      const request = {
        url: url instanceof Request ? url.url : url.toString(),
        headers: new Headers(init?.headers),
        body: new URLSearchParams(init?.body as string | undefined),
      };

      requests.push(request);

      return respond(request);
    },
  );

  const stripe = new Stripe("sk_test_unit", {
    httpClient: Stripe.createFetchHttpClient(fetchFn),
    maxNetworkRetries: 0,
  });

  return { service: new StripeService(stripe, config), requests, stripe };
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

  describe("refundPayment", () => {
    const refundInput: RefundPaymentInput = {
      paymentId: "9f1c2d3e-0000-4000-8000-000000000001",
      providerPaymentId: "pi_test_1",
    };

    const refund = { id: "re_test_1", object: "refund", status: "succeeded" };

    it("refunds the whole payment as a duplicate", async () => {
      const { service, requests } = serviceWith(() =>
        jsonResponse(200, refund),
      );

      await service.refundPayment(refundInput);

      expect(requests).toHaveLength(1);
      expect(requests[0].url).toMatch(/\/v1\/refunds$/);
      expect(Object.fromEntries(requests[0].body)).toEqual({
        payment_intent: "pi_test_1",
        reason: "duplicate",
        "metadata[paymentId]": "9f1c2d3e-0000-4000-8000-000000000001",
      });
    });

    it("keys the request by payment id so retries don't refund twice", async () => {
      const { service, requests } = serviceWith(() =>
        jsonResponse(200, refund),
      );

      await service.refundPayment(refundInput);

      expect(requests[0].headers.get("Idempotency-Key")).toBe(
        "refund-9f1c2d3e-0000-4000-8000-000000000001",
      );
    });

    it("reports an unreachable Stripe as unavailable", async () => {
      const { service } = serviceWith(() => {
        throw new TypeError("fetch failed");
      });

      await expect(service.refundPayment(refundInput)).rejects.toBeInstanceOf(
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

      await expect(service.refundPayment(refundInput)).rejects.toBeInstanceOf(
        PaymentProviderUnavailableError,
      );
    });

    it("passes a rejected request through unchanged", async () => {
      const { service } = serviceWith(() =>
        jsonResponse(400, {
          error: {
            type: "invalid_request_error",
            message: "Charge already refunded.",
          },
        }),
      );

      await expect(service.refundPayment(refundInput)).rejects.toBeInstanceOf(
        Stripe.errors.StripeInvalidRequestError,
      );
    });
  });

  describe("verifyWebhookEvent", () => {
    const eventBody = JSON.stringify({
      id: "evt_test_123",
      object: "event",
      type: "checkout.session.completed",
      data: { object: { id: "cs_test_123", object: "checkout.session" } },
    });

    // signs the body the way Stripe does, using the SDK's documented helper
    function sign(
      stripe: Stripe,
      body: string,
      options: { secret?: string; timestamp?: number } = {},
    ) {
      return stripe.webhooks.generateTestHeaderString({
        payload: body,
        secret: options.secret ?? config.stripeWebhookSecret,
        timestamp: options.timestamp,
      });
    }

    it("returns the event when the signature matches the body", () => {
      const { service, stripe } = serviceWith(() => jsonResponse(200, {}));

      const event = service.verifyWebhookEvent(
        Buffer.from(eventBody),
        sign(stripe, eventBody),
      );

      expect(event).toMatchObject({
        id: "evt_test_123",
        type: "checkout.session.completed",
      });
    });

    it("rejects a body changed after it was signed", () => {
      const { service, stripe } = serviceWith(() => jsonResponse(200, {}));
      const signature = sign(stripe, eventBody);
      const changedBody = eventBody.replace("cs_test_123", "cs_test_999");

      expect(() =>
        service.verifyWebhookEvent(Buffer.from(changedBody), signature),
      ).toThrow(InvalidWebhookSignatureError);
    });

    it("rejects a signature made with another secret", () => {
      const { service, stripe } = serviceWith(() => jsonResponse(200, {}));

      expect(() =>
        service.verifyWebhookEvent(
          Buffer.from(eventBody),
          sign(stripe, eventBody, { secret: "whsec_someone_else" }),
        ),
      ).toThrow(InvalidWebhookSignatureError);
    });

    it("rejects a request without a signature", () => {
      const { service } = serviceWith(() => jsonResponse(200, {}));

      expect(() =>
        service.verifyWebhookEvent(Buffer.from(eventBody), undefined),
      ).toThrow(InvalidWebhookSignatureError);
    });

    it("rejects a signature from long ago, so old requests can't be replayed", () => {
      const { service, stripe } = serviceWith(() => jsonResponse(200, {}));
      const oneHourAgoInSeconds = Math.floor(Date.now() / 1000) - 60 * 60;

      expect(() =>
        service.verifyWebhookEvent(
          Buffer.from(eventBody),
          sign(stripe, eventBody, { timestamp: oneHourAgoInSeconds }),
        ),
      ).toThrow(InvalidWebhookSignatureError);
    });

    it("never calls Stripe", () => {
      const { service, stripe, requests } = serviceWith(() =>
        jsonResponse(200, {}),
      );

      service.verifyWebhookEvent(
        Buffer.from(eventBody),
        sign(stripe, eventBody),
      );

      expect(requests).toEqual([]);
    });
  });
});

describe("completedCheckoutFromEvent", () => {
  // 2026-10-21T12:00:00Z, in the seconds Stripe uses
  const CREATED = 1792584000;

  // only the fields the mapper reads; the rest of Stripe's event is irrelevant
  function makeEvent(
    session: Partial<Stripe.Checkout.Session> = {},
  ): Stripe.CheckoutSessionCompletedEvent {
    return {
      id: "evt_test_1",
      type: "checkout.session.completed",
      created: CREATED,
      data: {
        object: {
          id: "cs_test_1",
          client_reference_id: "8b0e1f5c-0000-4000-8000-000000000004",
          payment_status: "paid",
          payment_intent: "pi_test_1",
          ...session,
        },
      },
    } as unknown as Stripe.CheckoutSessionCompletedEvent;
  }

  it("reads a paid checkout in our terms", () => {
    expect(completedCheckoutFromEvent(makeEvent())).toEqual({
      event: {
        provider: "stripe",
        eventId: "evt_test_1",
        type: "checkout.session.completed",
      },
      paymentId: "8b0e1f5c-0000-4000-8000-000000000004",
      providerCheckoutId: "cs_test_1",
      providerPayment: {
        id: "pi_test_1",
        paidAt: Temporal.Instant.from("2026-10-21T12:00:00Z"),
      },
    });
  });

  it("reads the payment intent id when it was expanded", () => {
    const event = makeEvent({
      payment_intent: { id: "pi_test_2" } as Stripe.PaymentIntent,
    });

    expect(completedCheckoutFromEvent(event).providerPayment?.id).toBe(
      "pi_test_2",
    );
  });

  it("passes a missing client_reference_id through as null", () => {
    const event = makeEvent({ client_reference_id: null });

    expect(completedCheckoutFromEvent(event).paymentId).toBeNull();
  });

  it("has no payment when the checkout completed unpaid", () => {
    const event = makeEvent({ payment_status: "unpaid", payment_intent: null });

    expect(completedCheckoutFromEvent(event).providerPayment).toBeNull();
  });

  it("throws when Stripe reports a paid checkout without a payment intent", () => {
    const event = makeEvent({ payment_intent: null });

    expect(() => completedCheckoutFromEvent(event)).toThrow(
      "Stripe reported Checkout Session cs_test_1 as paid without a payment intent.",
    );
  });
});
