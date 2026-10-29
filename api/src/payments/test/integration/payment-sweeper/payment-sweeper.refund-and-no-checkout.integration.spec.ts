import { Temporal } from "@js-temporal/polyfill";
import { Logger } from "@nestjs/common";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EmailOutboxRepository } from "@/email/email-outbox.repository.js";
import { EnrollmentsRepository } from "@/enrollments/enrollments.repository.js";
import type { CompletedCheckout } from "@/payments/stripe/checkout-events.js";
import { FulfillmentService } from "@/payments/fulfillment/fulfillment.service.js";
import { PaymentRefunds } from "@/payments/payment-refunds.js";
import { PaymentSweeper } from "@/payments/sweeper/payment-sweeper.js";
import { PaymentsRepository } from "@/payments/payments.repository.js";
import { DatabaseClock } from "@/prisma/database-clock.js";
import { db } from "@/prisma/db.js";
import { PrismaService } from "@/prisma/prisma.service.js";
import {
  createCustomer,
  createEnrollment,
  createPayment,
  createPendingPayment,
  createPricedCourse,
} from "@/test/course-fixtures.js";
import { FakeStripeService } from "@/payments/test/integration/payment-sweeper/payment-sweeper.fixtures.js";

describe("PaymentSweeper (integration)", () => {
  const paidAt = Temporal.Instant.from("2026-10-21T12:00:00Z");

  let stripeService: FakeStripeService;
  let fulfillment: FulfillmentService;
  let sweeper: PaymentSweeper;

  let courseId: string;
  let price: { id: string; amount: number; currency: string };
  let customer: { id: string; email: string };

  beforeEach(async () => {
    const prisma = new PrismaService();
    const paymentsRepository = new PaymentsRepository();
    const enrollmentsRepository = new EnrollmentsRepository();
    const clock = new DatabaseClock();

    stripeService = new FakeStripeService();

    const paymentRefunds = new PaymentRefunds(
      prisma,
      paymentsRepository,
      stripeService,
      clock,
    );

    fulfillment = new FulfillmentService(
      prisma,
      paymentsRepository,
      enrollmentsRepository,
      new EmailOutboxRepository(),
      paymentRefunds,
    );
    sweeper = new PaymentSweeper(
      prisma,
      paymentsRepository,
      enrollmentsRepository,
      fulfillment,
      paymentRefunds,
      stripeService,
      clock,
    );

    const pricedCourse = await createPricedCourse();
    courseId = pricedCourse.course.id;
    price = pricedCourse.price;
    customer = await createCustomer({});

    vi.spyOn(Logger.prototype, "warn").mockImplementation(() => {});
    vi.spyOn(Logger.prototype, "log").mockImplementation(() => {});
    vi.spyOn(Logger.prototype, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function paymentFields() {
    return {
      customerId: customer.id,
      coursePriceId: price.id,
      amount: price.amount,
      currency: price.currency,
    };
  }

  function hoursAgo(hours: number) {
    return Temporal.Now.instant().subtract({ hours });
  }

  function findPaymentRow(paymentId: string) {
    return db.orm.public.Payment.where((payment) =>
      payment.id.eq(paymentId),
    ).first();
  }

  function findEnrollments() {
    return db.orm.public.Enrollment.where((enrollment) =>
      enrollment.customerId.eq(customer.id),
    ).all();
  }

  function pendingPaymentWithCheckout(providerCheckoutId: string) {
    return createPendingPayment({
      ...paymentFields(),
      providerCheckoutId,
      createdAt: hoursAgo(2),
    });
  }

  describe("a payment owed a refund", () => {
    it("is refunded once, then left alone", async () => {
      const payment = await createPayment(paymentFields());

      await sweeper.sweep();
      await sweeper.sweep();

      expect(stripeService.refunds).toEqual([
        {
          paymentId: payment.id,
          providerPaymentId: payment.providerPaymentId,
          cause: "double_purchase",
        },
      ]);
      expect(await findPaymentRow(payment.id)).toMatchObject({
        status: "refunded",
        refundedAt: expect.anything(),
      });
    });

    it("stays unrefunded when the refund fails, and is retried next run", async () => {
      const payment = await createPayment(paymentFields());
      stripeService.refundFailure = new Error("stripe down");

      await sweeper.sweep();

      expect(await findPaymentRow(payment.id)).toMatchObject({
        status: "succeeded",
        refundedAt: null,
      });

      stripeService.refundFailure = undefined;
      await sweeper.sweep();

      expect(await findPaymentRow(payment.id)).toMatchObject({
        status: "refunded",
      });
      expect(stripeService.refunds).toHaveLength(2);
    });

    it("is refunded as a suspended buyer's when they are suspended", async () => {
      const disputedPayment = await createPayment(paymentFields());
      await createEnrollment({
        courseId,
        customerId: customer.id,
        paymentId: disputedPayment.id,
        suspendedAt: paidAt,
      });
      const payment = await createPayment(paymentFields());

      await sweeper.sweep();

      expect(stripeService.refunds).toEqual([
        expect.objectContaining({
          paymentId: payment.id,
          cause: "suspended_access",
        }),
      ]);
      expect(await findEnrollments()).toEqual([
        expect.objectContaining({
          paymentId: disputedPayment.id,
          suspendedAt: paidAt,
        }),
      ]);
    });

    it("doesn't touch the payment that bought the buyer's access", async () => {
      const boughtAccess = await createPayment(paymentFields());
      await createEnrollment({
        courseId,
        customerId: customer.id,
        paymentId: boughtAccess.id,
      });

      await sweeper.sweep();

      expect(stripeService.refunds).toEqual([]);
      expect(await findPaymentRow(boughtAccess.id)).toEqual(boughtAccess);
    });

    it("includes the loser of two payments fulfilled at once", async () => {
      const first = await pendingPaymentWithCheckout("cs_test_1");
      const second = await pendingPaymentWithCheckout("cs_test_2");
      const completion = (
        payment: { id: string },
        checkoutId: string,
      ): CompletedCheckout => ({
        event: {
          provider: "stripe",
          eventId: `evt_${checkoutId}`,
          type: "checkout.session.completed",
        },
        paymentId: payment.id,
        providerCheckoutId: checkoutId,
        providerPayment: { id: `pi_${checkoutId}`, paidAt },
      });

      await Promise.all([
        fulfillment.fulfillCheckout(completion(first, "cs_test_1")),
        fulfillment.fulfillCheckout(completion(second, "cs_test_2")),
      ]);
      const [enrollment] = await findEnrollments();
      const loserId = enrollment.paymentId === first.id ? second.id : first.id;

      await sweeper.sweep();

      expect(stripeService.refunds).toEqual([
        expect.objectContaining({
          paymentId: loserId,
          cause: "double_purchase",
        }),
      ]);
      expect(await findEnrollments()).toHaveLength(1);
    });
  });

  describe("a payment that never got a checkout", () => {
    it("is expired once Stripe's webhook retries are over", async () => {
      const abandoned = await createPendingPayment({
        ...paymentFields(),
        createdAt: hoursAgo(80),
      });
      const recent = await createPendingPayment({
        ...paymentFields(),
        createdAt: hoursAgo(10),
      });

      await sweeper.sweep();

      expect(await findPaymentRow(abandoned.id)).toMatchObject({
        status: "expired",
      });
      expect(await findPaymentRow(recent.id)).toEqual(recent);
    });
  });
});
