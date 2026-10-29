import Stripe from "stripe";
import { describe, expect, it } from "vitest";
import {
  InvalidWebhookSignatureError,
  PaymentProviderUnavailableError,
  type RefundPaymentInput,
} from "@/payments/stripe/stripe.service.js";
import {
  config,
  jsonResponse,
  serviceWith,
} from "@/payments/test/unit/stripe.service/stripe.service.fixtures.js";

describe("StripeService", () => {
  describe("refundPayment", () => {
    const refundInput: RefundPaymentInput = {
      paymentId: "9f1c2d3e-0000-4000-8000-000000000001",
      providerPaymentId: "pi_test_1",
      cause: "double_purchase",
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
        "metadata[refundCause]": "double_purchase",
      });
    });

    it("sends no reason when the buyer's access is suspended", async () => {
      const { service, requests } = serviceWith(() =>
        jsonResponse(200, refund),
      );

      await service.refundPayment({
        ...refundInput,
        cause: "suspended_access",
      });

      expect(Object.fromEntries(requests[0].body)).toEqual({
        payment_intent: "pi_test_1",
        "metadata[paymentId]": "9f1c2d3e-0000-4000-8000-000000000001",
        "metadata[refundCause]": "suspended_access",
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

    it("counts a payment that is already fully refunded as refunded", async () => {
      const { service } = serviceWith(() =>
        jsonResponse(400, {
          error: {
            type: "invalid_request_error",
            code: "charge_already_refunded",
            message: "Charge ch_test_1 has already been refunded.",
          },
        }),
      );

      await expect(service.refundPayment(refundInput)).resolves.toBeUndefined();
    });

    it("passes any other rejected request through unchanged", async () => {
      const { service } = serviceWith(() =>
        jsonResponse(400, {
          error: {
            type: "invalid_request_error",
            code: "resource_missing",
            message: "No such payment_intent: pi_test_1",
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
