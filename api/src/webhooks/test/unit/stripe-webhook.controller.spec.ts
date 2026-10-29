import type { RawBodyRequest } from "@nestjs/common";
import type { Request } from "express";
import type Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiException } from "@/common/errors/api.exception.js";
import { ExpiryService } from "@/payments/fulfillment/expiry.service.js";
import { FulfillmentService } from "@/payments/fulfillment/fulfillment.service.js";
import {
  InvalidWebhookSignatureError,
  StripeService,
} from "@/payments/stripe/stripe.service.js";
import { asDependency, type MockMethods } from "@/test/test-helpers.js";
import { StripeWebhookController } from "@/webhooks/stripe-webhook.controller.js";

const PAYMENT_ID = "8b0e1f5c-0000-4000-8000-000000000004";

const rawBody = Buffer.from("{}");
const request = { rawBody } as RawBodyRequest<Request>;

function sessionEvent(
  type: "checkout.session.completed" | "checkout.session.expired",
): Stripe.Event {
  return {
    id: "evt_test_1",
    type,
    created: 1_761_000_000,
    data: {
      object: {
        id: "cs_test_1",
        client_reference_id: PAYMENT_ID,
        payment_status: "paid",
        payment_intent: "pi_test_1",
      },
    },
  } as unknown as Stripe.Event;
}

describe("StripeWebhookController", () => {
  let controller: StripeWebhookController;
  let stripeService: MockMethods<StripeService, "verifyWebhookEvent">;
  let fulfillmentService: MockMethods<FulfillmentService, "fulfillCheckout">;
  let expiryService: MockMethods<ExpiryService, "expireCheckout">;

  beforeEach(() => {
    stripeService = {
      verifyWebhookEvent: vi.fn<StripeService["verifyWebhookEvent"]>(),
    };
    fulfillmentService = {
      fulfillCheckout: vi
        .fn<FulfillmentService["fulfillCheckout"]>()
        .mockResolvedValue(undefined),
    };
    expiryService = {
      expireCheckout: vi
        .fn<ExpiryService["expireCheckout"]>()
        .mockResolvedValue(undefined),
    };

    controller = new StripeWebhookController(
      asDependency<StripeService>(stripeService),
      asDependency<FulfillmentService>(fulfillmentService),
      asDependency<ExpiryService>(expiryService),
    );
  });

  it("verifies the raw body against the signature header", async () => {
    stripeService.verifyWebhookEvent.mockReturnValue(
      sessionEvent("checkout.session.expired"),
    );

    await controller.receiveStripeEvent(request, "t=1,v1=abc");

    expect(stripeService.verifyWebhookEvent).toHaveBeenCalledWith(
      rawBody,
      "t=1,v1=abc",
    );
  });

  it("fulfills a completed checkout", async () => {
    stripeService.verifyWebhookEvent.mockReturnValue(
      sessionEvent("checkout.session.completed"),
    );

    await controller.receiveStripeEvent(request, "sig");

    expect(fulfillmentService.fulfillCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({ eventId: "evt_test_1" }),
        paymentId: PAYMENT_ID,
      }),
    );
    expect(expiryService.expireCheckout).not.toHaveBeenCalled();
  });

  it("expires an expired checkout", async () => {
    stripeService.verifyWebhookEvent.mockReturnValue(
      sessionEvent("checkout.session.expired"),
    );

    await controller.receiveStripeEvent(request, "sig");

    expect(expiryService.expireCheckout).toHaveBeenCalledWith(
      expect.objectContaining({ paymentId: PAYMENT_ID }),
    );
    expect(fulfillmentService.fulfillCheckout).not.toHaveBeenCalled();
  });

  it("acknowledges other event types without handling them", async () => {
    stripeService.verifyWebhookEvent.mockReturnValue({
      id: "evt_test_2",
      type: "charge.refunded",
    } as Stripe.Event);

    await controller.receiveStripeEvent(request, "sig");

    expect(fulfillmentService.fulfillCheckout).not.toHaveBeenCalled();
    expect(expiryService.expireCheckout).not.toHaveBeenCalled();
  });

  it("rejects an invalid signature with INVALID_WEBHOOK_SIGNATURE", async () => {
    stripeService.verifyWebhookEvent.mockImplementation(() => {
      throw new InvalidWebhookSignatureError();
    });

    const result = controller.receiveStripeEvent(request, undefined);

    await expect(result).rejects.toBeInstanceOf(ApiException);
    await expect(result).rejects.toMatchObject({
      code: "INVALID_WEBHOOK_SIGNATURE",
    });
    expect(fulfillmentService.fulfillCheckout).not.toHaveBeenCalled();
  });

  it("lets a handler failure through so Stripe retries", async () => {
    stripeService.verifyWebhookEvent.mockReturnValue(
      sessionEvent("checkout.session.completed"),
    );
    fulfillmentService.fulfillCheckout.mockRejectedValue(new Error("db down"));

    await expect(controller.receiveStripeEvent(request, "sig")).rejects.toThrow(
      "db down",
    );
  });
});
