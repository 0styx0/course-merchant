import { Temporal } from "@js-temporal/polyfill";
import { describe, expect, it, vi } from "vitest";

import { DatabaseClock } from "@/prisma/database-clock.js";
import { PaymentRefunds } from "@/payments/payment-refunds.js";
import { PaymentsRepository } from "@/payments/payments.repository.js";
import {
  StripeService,
  type RefundPaymentInput,
} from "@/payments/stripe.service.js";
import {
  asDependency,
  fakePrisma,
  type MockMethods,
} from "@/test/test-helpers.js";

const refundedAt = Temporal.Instant.from("2026-10-26T12:00:00Z");

const input: RefundPaymentInput = {
  paymentId: "8b0e1f5c-0000-4000-8000-000000000004",
  providerPaymentId: "pi_test_1",
  cause: "double_purchase",
};

function makeRefunds() {
  const fake = fakePrisma();
  const calls: string[] = [];
  const paymentsRepository: MockMethods<
    PaymentsRepository,
    "markPaymentRefunded"
  > = {
    markPaymentRefunded: vi.fn<PaymentsRepository["markPaymentRefunded"]>(
      () => {
        calls.push("markPaymentRefunded");

        return Promise.resolve(true);
      },
    ),
  };
  const stripeService: MockMethods<StripeService, "refundPayment"> = {
    refundPayment: vi.fn<StripeService["refundPayment"]>(() => {
      calls.push("refundPayment");

      return Promise.resolve();
    }),
  };
  const clock: MockMethods<DatabaseClock, "now"> = {
    now: vi.fn<DatabaseClock["now"]>().mockResolvedValue(refundedAt),
  };

  return {
    fake,
    calls,
    paymentsRepository,
    stripeService,
    refunds: new PaymentRefunds(
      fake.prisma,
      asDependency<PaymentsRepository>(paymentsRepository),
      asDependency<StripeService>(stripeService),
      asDependency<DatabaseClock>(clock),
    ),
  };
}

describe("PaymentRefunds", () => {
  it("refunds the payment, then records it as refunded at the database time", async () => {
    const { refunds, stripeService, paymentsRepository, calls, fake } =
      makeRefunds();

    await refunds.refund(input);

    expect(stripeService.refundPayment).toHaveBeenCalledExactlyOnceWith(input);
    expect(paymentsRepository.markPaymentRefunded).toHaveBeenCalledWith(
      fake.db,
      input.paymentId,
      refundedAt,
    );
    expect(calls).toEqual(["refundPayment", "markPaymentRefunded"]);
  });

  it("leaves the payment unrecorded when the refund fails", async () => {
    const { refunds, stripeService, paymentsRepository } = makeRefunds();
    stripeService.refundPayment.mockRejectedValue(new Error("stripe down"));

    await expect(refunds.refund(input)).rejects.toThrow("stripe down");
    expect(paymentsRepository.markPaymentRefunded).not.toHaveBeenCalled();
  });

  it("doesn't use a transaction, since it calls Stripe", async () => {
    const { refunds, fake } = makeRefunds();

    await refunds.refund(input);

    expect(fake.db.transaction).not.toHaveBeenCalled();
  });
});
