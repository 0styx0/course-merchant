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
  createPendingPayment,
  createPricedCourse,
} from "@/test/course-fixtures.js";
import { FakeStripeService } from "@/payments/test/integration/payment-sweeper/payment-sweeper.fixtures.js";

describe("PaymentSweeper (integration)", () => {
  const paidAt = Temporal.Instant.from("2026-10-21T12:00:00Z");

  let stripeService: FakeStripeService;
  let fulfillment: FulfillmentService;
  let sweeper: PaymentSweeper;
  let errorSpy: ReturnType<typeof vi.spyOn>;

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
    errorSpy = vi.spyOn(Logger.prototype, "error").mockImplementation(() => {});
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

  function findEmails() {
    return db.orm.public.EmailOutbox.where((email) =>
      email.recipient.eq(customer.email),
    ).all();
  }

  function pendingPaymentWithCheckout(providerCheckoutId: string) {
    return createPendingPayment({
      ...paymentFields(),
      providerCheckoutId,
      createdAt: hoursAgo(2),
    });
  }

  describe("a payment whose webhook never arrived", () => {
    it("is fulfilled from the checkout Stripe reports", async () => {
      const payment = await pendingPaymentWithCheckout("cs_test_paid");
      stripeService.checkouts.set("cs_test_paid", {
        state: "completed",
        completion: {
          paymentId: payment.id,
          providerCheckoutId: "cs_test_paid",
          providerPayment: { id: "pi_test_paid", paidAt },
        },
      });

      await sweeper.sweep();

      expect(await findPaymentRow(payment.id)).toMatchObject({
        status: "succeeded",
        providerPaymentId: "pi_test_paid",
        paidAt,
      });
      expect(await findEnrollments()).toEqual([
        expect.objectContaining({
          courseId,
          paymentId: payment.id,
          purchasedAt: paidAt,
        }),
      ]);
      expect(await findEmails()).toEqual([
        expect.objectContaining({ kind: "access_granted" }),
      ]);
      expect(stripeService.refunds).toEqual([]);
    });

    it("changes nothing when its webhook arrives late", async () => {
      const payment = await pendingPaymentWithCheckout("cs_test_paid");
      const completion = {
        paymentId: payment.id,
        providerCheckoutId: "cs_test_paid",
        providerPayment: { id: "pi_test_paid", paidAt },
      };
      stripeService.checkouts.set("cs_test_paid", {
        state: "completed",
        completion,
      });
      const lateWebhook: CompletedCheckout = {
        ...completion,
        event: {
          provider: "stripe",
          eventId: "evt_test_late",
          type: "checkout.session.completed",
        },
      };

      await sweeper.sweep();
      await fulfillment.fulfillCheckout(lateWebhook);

      expect(await findEnrollments()).toHaveLength(1);
      expect(await findEmails()).toHaveLength(1);
      expect(stripeService.refunds).toEqual([]);
    });

    it("is expired when Stripe says the checkout expired", async () => {
      const payment = await pendingPaymentWithCheckout("cs_test_expired");
      stripeService.checkouts.set("cs_test_expired", { state: "expired" });

      await sweeper.sweep();

      expect(await findPaymentRow(payment.id)).toMatchObject({
        status: "expired",
      });
      expect(await findEnrollments()).toEqual([]);
    });

    it("is left alone while its checkout is open", async () => {
      const payment = await pendingPaymentWithCheckout("cs_test_open");
      stripeService.checkouts.set("cs_test_open", { state: "open" });

      await sweeper.sweep();

      expect(await findPaymentRow(payment.id)).toEqual(payment);
    });

    it("isn't asked about while it's under an hour old", async () => {
      await createPendingPayment({
        ...paymentFields(),
        providerCheckoutId: "cs_test_new",
      });

      await sweeper.sweep();

      // the fake rejects a checkout it wasn't told about
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it("doesn't stop the others when Stripe fails for one", async () => {
      await pendingPaymentWithCheckout("cs_test_unknown");
      const expired = await pendingPaymentWithCheckout("cs_test_expired");
      stripeService.checkouts.set("cs_test_expired", { state: "expired" });

      await sweeper.sweep();

      expect(await findPaymentRow(expired.id)).toMatchObject({
        status: "expired",
      });
      expect(errorSpy).toHaveBeenCalledTimes(1);
    });
  });
});
