import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ExpiredCheckout } from "@/payments/stripe/checkout-events.js";
import { ExpiryService } from "@/payments/fulfillment/expiry.service.js";
import { PaymentsRepository } from "@/payments/payments.repository.js";
import {
  asDependency,
  fakePrisma,
  type MockMethods,
} from "@/test/test-helpers.js";

const PAYMENT_ID = "8b0e1f5c-0000-4000-8000-000000000004";

function makeCheckout(
  overrides: Partial<ExpiredCheckout> = {},
): ExpiredCheckout {
  return {
    event: {
      provider: "stripe",
      eventId: "evt_test_1",
      type: "checkout.session.expired",
    },
    paymentId: PAYMENT_ID,
    ...overrides,
  };
}

describe("ExpiryService", () => {
  const { prisma, tx } = fakePrisma();

  let service: ExpiryService;
  let paymentsRepository: MockMethods<
    PaymentsRepository,
    "recordProcessedEvent" | "markPaymentExpired"
  >;

  beforeEach(() => {
    paymentsRepository = {
      recordProcessedEvent: vi
        .fn<PaymentsRepository["recordProcessedEvent"]>()
        .mockResolvedValue(true),
      markPaymentExpired: vi
        .fn<PaymentsRepository["markPaymentExpired"]>()
        .mockResolvedValue(true),
    };

    service = new ExpiryService(
      prisma,
      asDependency<PaymentsRepository>(paymentsRepository),
    );
  });

  it("expires the payment of a new event, in the transaction", async () => {
    const checkout = makeCheckout();

    await service.expireCheckout(checkout);

    expect(paymentsRepository.recordProcessedEvent).toHaveBeenCalledWith(
      tx,
      checkout.event,
    );
    expect(paymentsRepository.markPaymentExpired).toHaveBeenCalledWith(
      tx,
      PAYMENT_ID,
    );
  });

  it("does nothing for a redelivered event", async () => {
    paymentsRepository.recordProcessedEvent.mockResolvedValue(false);

    await service.expireCheckout(makeCheckout());

    expect(paymentsRepository.markPaymentExpired).not.toHaveBeenCalled();
  });

  it.each([null, "not-a-uuid"])(
    "records the event but expires nothing for payment id %s",
    async (paymentId) => {
      await service.expireCheckout(makeCheckout({ paymentId }));

      expect(paymentsRepository.recordProcessedEvent).toHaveBeenCalled();
      expect(paymentsRepository.markPaymentExpired).not.toHaveBeenCalled();
    },
  );
});
