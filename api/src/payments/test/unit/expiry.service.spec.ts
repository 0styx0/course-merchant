import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

import type { ExpiredCheckout } from "@/payments/checkout-events.js";
import { ExpiryService } from "@/payments/expiry.service.js";
import { PaymentsRepository } from "@/payments/payments.repository.js";
import { PrismaService } from "@/prisma/prisma.service.js";

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
  const tx = { orm: {} };

  let service: ExpiryService;
  let paymentsRepository: {
    recordProcessedEvent: Mock<PaymentsRepository["recordProcessedEvent"]>;
    markPaymentExpired: Mock<PaymentsRepository["markPaymentExpired"]>;
  };

  beforeEach(() => {
    paymentsRepository = {
      recordProcessedEvent: vi.fn().mockResolvedValue(true),
      markPaymentExpired: vi.fn().mockResolvedValue(true),
    };
    const prisma = {
      db: {
        transaction: vi.fn((work: (scope: typeof tx) => unknown) => work(tx)),
      },
    };

    service = new ExpiryService(
      prisma as unknown as PrismaService,
      paymentsRepository as unknown as PaymentsRepository,
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
