import { Temporal } from "@js-temporal/polyfill";
import { Logger } from "@nestjs/common";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EnrollmentsRepository } from "@/enrollments/enrollments.repository.js";
import { FulfillmentService } from "@/payments/fulfillment/fulfillment.service.js";
import { PaymentRefunds } from "@/payments/payment-refunds.js";
import { PaymentSweeper } from "@/payments/sweeper/payment-sweeper.js";
import {
  PaymentsRepository,
  type OrphanPayment,
} from "@/payments/payments.repository.js";
import { StripeService } from "@/payments/stripe/stripe.service.js";
import { DatabaseClock } from "@/prisma/database-clock.js";
import {
  asDependency,
  fakePrisma,
  type MockMethods,
} from "@/test/test-helpers.js";
import {
  now,
  orphan,
} from "@/payments/test/unit/payment-sweeper/payment-sweeper.fixtures.js";

describe("PaymentSweeper", () => {
  let fake: ReturnType<typeof fakePrisma>;
  let paymentsRepository: MockMethods<
    PaymentsRepository,
    | "findOrphanPayments"
    | "findStalePendingPayments"
    | "markPaymentExpired"
    | "expirePaymentsWithoutCheckout"
  >;
  let enrollmentsRepository: MockMethods<
    EnrollmentsRepository,
    "findEnrollment"
  >;
  let fulfillment: MockMethods<FulfillmentService, "fulfillRetrievedCheckout">;
  let paymentRefunds: MockMethods<PaymentRefunds, "refund">;
  let stripeService: MockMethods<StripeService, "retrieveCheckout">;
  let sweeper: PaymentSweeper;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fake = fakePrisma();
    paymentsRepository = {
      findOrphanPayments: vi
        .fn<PaymentsRepository["findOrphanPayments"]>()
        .mockResolvedValue([]),
      findStalePendingPayments: vi
        .fn<PaymentsRepository["findStalePendingPayments"]>()
        .mockResolvedValue([]),
      markPaymentExpired: vi
        .fn<PaymentsRepository["markPaymentExpired"]>()
        .mockResolvedValue(true),
      expirePaymentsWithoutCheckout: vi
        .fn<PaymentsRepository["expirePaymentsWithoutCheckout"]>()
        .mockResolvedValue(0),
    };
    enrollmentsRepository = {
      findEnrollment: vi
        .fn<EnrollmentsRepository["findEnrollment"]>()
        .mockResolvedValue(null),
    };
    fulfillment = {
      fulfillRetrievedCheckout: vi
        .fn<FulfillmentService["fulfillRetrievedCheckout"]>()
        .mockResolvedValue(),
    };
    paymentRefunds = {
      refund: vi.fn<PaymentRefunds["refund"]>().mockResolvedValue(),
    };
    stripeService = {
      retrieveCheckout: vi.fn<StripeService["retrieveCheckout"]>(),
    };

    sweeper = new PaymentSweeper(
      fake.prisma,
      asDependency<PaymentsRepository>(paymentsRepository),
      asDependency<EnrollmentsRepository>(enrollmentsRepository),
      asDependency<FulfillmentService>(fulfillment),
      asDependency<PaymentRefunds>(paymentRefunds),
      asDependency<StripeService>(stripeService),
      asDependency<DatabaseClock>({
        now: vi.fn<DatabaseClock["now"]>().mockResolvedValue(now),
      }),
    );
    vi.spyOn(Logger.prototype, "warn").mockImplementation(() => {});
    vi.spyOn(Logger.prototype, "log").mockImplementation(() => {});
    errorSpy = vi.spyOn(Logger.prototype, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("expires payments with no checkout that are older than Stripe's webhook retries", async () => {
    await sweeper.sweep();

    expect(
      paymentsRepository.expirePaymentsWithoutCheckout,
    ).toHaveBeenCalledExactlyOnceWith(
      fake.db,
      Temporal.Instant.from("2026-10-23T12:00:00Z"),
    );
  });

  it("runs the other checks when one fails", async () => {
    paymentsRepository.findOrphanPayments.mockRejectedValue(
      new Error("db down"),
    );

    await sweeper.sweep();

    expect(paymentsRepository.findStalePendingPayments).toHaveBeenCalled();
    expect(paymentsRepository.expirePaymentsWithoutCheckout).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("refund"),
      expect.stringContaining("db down"),
    );
  });

  it("makes no database transaction, so no Stripe call happens inside one", async () => {
    paymentsRepository.findOrphanPayments.mockResolvedValue([orphan]);

    await sweeper.sweep();

    expect(fake.db.transaction).not.toHaveBeenCalled();
  });

  describe("scheduling", () => {
    it("skips a run while the previous one is still going", async () => {
      let finishLookup!: (payments: OrphanPayment[]) => void;
      paymentsRepository.findOrphanPayments.mockReturnValue(
        new Promise((resolve) => {
          finishLookup = resolve;
        }),
      );

      const firstRun = sweeper.runIfIdle();
      await sweeper.runIfIdle();

      expect(paymentsRepository.findOrphanPayments).toHaveBeenCalledTimes(1);

      finishLookup([]);
      await firstRun;
      await sweeper.runIfIdle();

      expect(paymentsRepository.findOrphanPayments).toHaveBeenCalledTimes(2);
    });

    it("starts no run once shutting down", async () => {
      await sweeper.onApplicationShutdown();
      await sweeper.runIfIdle();

      expect(paymentsRepository.findOrphanPayments).not.toHaveBeenCalled();
    });

    it("waits for the run in progress when shutting down", async () => {
      let finishLookup!: (payments: OrphanPayment[]) => void;
      paymentsRepository.findOrphanPayments.mockReturnValue(
        new Promise((resolve) => {
          finishLookup = resolve;
        }),
      );
      let hasShutDown = false;

      const run = sweeper.runIfIdle();
      const shutdown = sweeper.onApplicationShutdown().then(() => {
        hasShutDown = true;
      });
      await Promise.resolve();

      expect(hasShutDown).toBe(false);

      finishLookup([]);
      await Promise.all([run, shutdown]);

      expect(hasShutDown).toBe(true);
    });

    it("stops refunding between payments once shutting down", async () => {
      const other = { ...orphan, id: "8b0e1f5c-0000-4000-8000-000000000009" };
      paymentsRepository.findOrphanPayments.mockResolvedValue([orphan, other]);
      paymentRefunds.refund.mockImplementationOnce(() => {
        void sweeper.onApplicationShutdown();

        return Promise.resolve();
      });

      await sweeper.runIfIdle();

      expect(paymentRefunds.refund).toHaveBeenCalledTimes(1);
    });
  });
});
