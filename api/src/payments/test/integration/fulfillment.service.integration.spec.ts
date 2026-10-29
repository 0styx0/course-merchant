import { Temporal } from "@js-temporal/polyfill";
import { beforeEach, describe, expect, it } from "vitest";

import type { DbScope } from "types.js";
import {
  EmailOutboxRepository,
  type QueuedEmail,
} from "@/email/email-outbox.repository.js";
import { EnrollmentsRepository } from "@/enrollments/enrollments.repository.js";
import type { CompletedCheckout } from "@/payments/stripe/checkout-events.js";
import { FulfillmentService } from "@/payments/fulfillment/fulfillment.service.js";
import { PaymentRefunds } from "@/payments/payment-refunds.js";
import { PaymentsRepository } from "@/payments/payments.repository.js";
import {
  StripeService,
  type RefundPaymentInput,
} from "@/payments/stripe/stripe.service.js";
import { db } from "@/prisma/db.js";
import { DatabaseClock } from "@/prisma/database-clock.js";
import { PrismaService } from "@/prisma/prisma.service.js";
import {
  createCustomer,
  createEnrollment,
  createPendingPayment,
  createPricedCourse,
} from "@/test/course-fixtures.js";

class FailingEmailOutbox extends EmailOutboxRepository {
  override enqueue(_scope: DbScope, _email: QueuedEmail): Promise<void> {
    return Promise.reject(new Error("outbox unavailable"));
  }
}

// records the refunds it is asked for, or fails them, instead of calling Stripe
class FakeStripeService extends StripeService {
  readonly refunds: RefundPaymentInput[] = [];

  constructor(private readonly failure?: Error) {
    super(undefined as never, undefined as never);
  }

  override refundPayment(input: RefundPaymentInput): Promise<void> {
    this.refunds.push(input);

    return this.failure ? Promise.reject(this.failure) : Promise.resolve();
  }
}

describe("FulfillmentService (integration)", () => {
  const paidAt = Temporal.Instant.from("2026-10-21T12:00:00Z");

  function serviceWith(
    emailOutbox = new EmailOutboxRepository(),
    stripeService = new FakeStripeService(),
  ) {
    const prisma = new PrismaService();
    const paymentsRepository = new PaymentsRepository();

    return new FulfillmentService(
      prisma,
      paymentsRepository,
      new EnrollmentsRepository(),
      emailOutbox,
      new PaymentRefunds(
        prisma,
        paymentsRepository,
        stripeService,
        new DatabaseClock(),
      ),
    );
  }

  let stripeService: FakeStripeService;
  let service: FulfillmentService;

  let courseId: string;
  let price: { id: string; amount: number; currency: string };
  let customer: { id: string; email: string };

  beforeEach(async () => {
    stripeService = new FakeStripeService();
    service = serviceWith(undefined, stripeService);

    const pricedCourse = await createPricedCourse();
    courseId = pricedCourse.course.id;
    price = pricedCourse.price;
    customer = await createCustomer({});
  });

  function createOurPayment() {
    return createPendingPayment({
      customerId: customer.id,
      coursePriceId: price.id,
      amount: price.amount,
      currency: price.currency,
    });
  }

  function completedCheckout(paymentId: string): CompletedCheckout {
    return {
      event: {
        provider: "stripe",
        eventId: `evt_test_${crypto.randomUUID()}`,
        type: "checkout.session.completed",
      },
      paymentId,
      providerCheckoutId: `cs_test_${crypto.randomUUID()}`,
      providerPayment: { id: `pi_test_${crypto.randomUUID()}`, paidAt },
    };
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

  function findProcessedEvents() {
    return db.orm.public.ProcessedPaymentEvent.all();
  }

  it("fulfills a new buyer's payment", async () => {
    const payment = await createOurPayment();
    const checkout = completedCheckout(payment.id);

    await service.fulfillCheckout(checkout);

    expect(await findPaymentRow(payment.id)).toMatchObject({
      status: "succeeded",
      providerCheckoutId: checkout.providerCheckoutId,
      providerPaymentId: checkout.providerPayment!.id,
      paidAt,
    });
    expect(stripeService.refunds).toEqual([]);
    expect(await findEnrollments()).toEqual([
      expect.objectContaining({
        courseId,
        paymentId: payment.id,
        purchasedAt: paidAt,
        revokedAt: null,
      }),
    ]);
    expect(await findEmails()).toEqual([
      expect.objectContaining({
        kind: "access_granted",
        payload: { courseId, customerId: customer.id },
      }),
    ]);
  });

  it("fulfills a redelivered event only once", async () => {
    const payment = await createOurPayment();
    const checkout = completedCheckout(payment.id);

    await service.fulfillCheckout(checkout);
    await service.fulfillCheckout(checkout);

    expect(await findEnrollments()).toHaveLength(1);
    expect(await findEmails()).toHaveLength(1);
  });

  it("reactivates a refunded enrollment with the new payment", async () => {
    const refundedPayment = await createOurPayment();
    await createEnrollment({
      courseId,
      customerId: customer.id,
      paymentId: refundedPayment.id,
    });
    await db.orm.public.Enrollment.where((enrollment) =>
      enrollment.customerId.eq(customer.id),
    ).update({ revokedAt: Temporal.Instant.from("2026-10-01T00:00:00Z") });

    const payment = await createOurPayment();
    await service.fulfillCheckout(completedCheckout(payment.id));

    expect(await findEnrollments()).toEqual([
      expect.objectContaining({
        paymentId: payment.id,
        purchasedAt: paidAt,
        revokedAt: null,
      }),
    ]);
    expect(await findEmails()).toEqual([
      expect.objectContaining({ kind: "access_granted" }),
    ]);
  });

  it("refunds a payment from a suspended buyer and keeps the suspension", async () => {
    const disputedPayment = await createOurPayment();
    await createEnrollment({
      courseId,
      customerId: customer.id,
      paymentId: disputedPayment.id,
    });
    const suspendedAt = Temporal.Instant.from("2026-10-01T00:00:00Z");
    await db.orm.public.Enrollment.where((enrollment) =>
      enrollment.customerId.eq(customer.id),
    ).update({ suspendedAt });

    const payment = await createOurPayment();
    const checkout = completedCheckout(payment.id);
    await service.fulfillCheckout(checkout);

    expect(stripeService.refunds).toEqual([
      {
        paymentId: payment.id,
        providerPaymentId: checkout.providerPayment!.id,
        cause: "suspended_access",
      },
    ]);
    expect(await findEnrollments()).toEqual([
      expect.objectContaining({ paymentId: disputedPayment.id, suspendedAt }),
    ]);
    expect(await findEmails()).toEqual([
      expect.objectContaining({
        kind: "access_suspended",
        payload: { courseId, customerId: customer.id, refundIssued: true },
      }),
    ]);
  });

  it("keeps the first payment's access on a double purchase and asks for a refund", async () => {
    const firstPayment = await createOurPayment();
    const secondPayment = await createOurPayment();

    await service.fulfillCheckout(completedCheckout(firstPayment.id));
    const secondCheckout = completedCheckout(secondPayment.id);
    await service.fulfillCheckout(secondCheckout);

    expect(stripeService.refunds).toEqual([
      {
        paymentId: secondPayment.id,
        providerPaymentId: secondCheckout.providerPayment!.id,
        cause: "double_purchase",
      },
    ]);
    expect(await findPaymentRow(secondPayment.id)).toMatchObject({
      status: "refunded",
      refundedAt: expect.anything(),
    });
    expect(await findEnrollments()).toEqual([
      expect.objectContaining({ paymentId: firstPayment.id }),
    ]);
    expect((await findEmails()).map((email) => email.payload)).toEqual(
      expect.arrayContaining([
        { courseId, customerId: customer.id },
        { courseId, customerId: customer.id, refundIssued: true },
      ]),
    );
  });

  it("keeps a double purchase fulfilled when its refund fails", async () => {
    const failingStripe = new FakeStripeService(new Error("stripe down"));
    const failingService = serviceWith(undefined, failingStripe);
    const firstPayment = await createOurPayment();
    const secondPayment = await createOurPayment();
    await failingService.fulfillCheckout(completedCheckout(firstPayment.id));

    await expect(
      failingService.fulfillCheckout(completedCheckout(secondPayment.id)),
    ).resolves.toBeUndefined();

    expect(failingStripe.refunds).toHaveLength(1);
    expect(await findPaymentRow(secondPayment.id)).toMatchObject({
      status: "succeeded",
    });
    expect(await findProcessedEvents()).toHaveLength(2);
  });

  it("grants access once when two payments for the course are fulfilled concurrently", async () => {
    const firstPayment = await createOurPayment();
    const secondPayment = await createOurPayment();

    await Promise.all([
      service.fulfillCheckout(completedCheckout(firstPayment.id)),
      service.fulfillCheckout(completedCheckout(secondPayment.id)),
    ]);

    expect(await findPaymentRow(firstPayment.id)).toMatchObject({
      status: "succeeded",
    });
    expect(await findPaymentRow(secondPayment.id)).toMatchObject({
      status: "succeeded",
    });
    expect(await findEnrollments()).toHaveLength(1);
    // the losing payment is left to the sweeper's double-purchase refund
    expect(await findEmails()).toEqual([
      expect.objectContaining({ kind: "access_granted" }),
    ]);
  });

  it("changes nothing when part of the fulfillment fails", async () => {
    const payment = await createOurPayment();

    await expect(
      serviceWith(new FailingEmailOutbox()).fulfillCheckout(
        completedCheckout(payment.id),
      ),
    ).rejects.toThrow("outbox unavailable");

    expect(await findProcessedEvents()).toEqual([]);
    expect(await findPaymentRow(payment.id)).toMatchObject({
      status: "pending",
      paidAt: null,
    });
    expect(await findEnrollments()).toEqual([]);
  });
});
