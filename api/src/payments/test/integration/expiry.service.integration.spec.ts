import { Temporal } from "@js-temporal/polyfill";
import { beforeEach, describe, expect, it } from "vitest";

import { EmailOutboxRepository } from "@/email/email-outbox.repository.js";
import { EnrollmentsRepository } from "@/enrollments/enrollments.repository.js";
import type { ExpiredCheckout } from "@/payments/checkout-events.js";
import { ExpiryService } from "@/payments/expiry.service.js";
import { FulfillmentService } from "@/payments/fulfillment.service.js";
import { PaymentsRepository } from "@/payments/payments.repository.js";
import { StripeService } from "@/payments/stripe.service.js";
import { db } from "@/prisma/db.js";
import { PrismaService } from "@/prisma/prisma.service.js";
import {
  createCustomer,
  createPendingPayment,
  createPricedCourse,
} from "@/test/course-fixtures.js";

describe("ExpiryService (integration)", () => {
  const service = new ExpiryService(
    new PrismaService(),
    new PaymentsRepository(),
  );

  let price: { id: string; amount: number; currency: string };
  let customer: { id: string; email: string };

  beforeEach(async () => {
    price = (await createPricedCourse()).price;
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

  function expiredCheckout(paymentId: string): ExpiredCheckout {
    return {
      event: {
        provider: "stripe",
        eventId: `evt_test_${crypto.randomUUID()}`,
        type: "checkout.session.expired",
      },
      paymentId,
    };
  }

  async function paymentStatus(paymentId: string) {
    const payment = await db.orm.public.Payment.where((candidate) =>
      candidate.id.eq(paymentId),
    ).first();

    return payment?.status;
  }

  it("expires a pending payment and records the event", async () => {
    const payment = await createOurPayment();
    const checkout = expiredCheckout(payment.id);

    await service.expireCheckout(checkout);

    expect(await paymentStatus(payment.id)).toBe("expired");
    expect(await db.orm.public.ProcessedPaymentEvent.all()).toEqual([
      expect.objectContaining({ eventId: checkout.event.eventId }),
    ]);
  });

  it("handles a redelivered event without error", async () => {
    const payment = await createOurPayment();
    const checkout = expiredCheckout(payment.id);

    await service.expireCheckout(checkout);
    await service.expireCheckout(checkout);

    expect(await paymentStatus(payment.id)).toBe("expired");
    expect(await db.orm.public.ProcessedPaymentEvent.all()).toHaveLength(1);
  });

  it("ignores a payment id that isn't ours", async () => {
    await service.expireCheckout(expiredCheckout("not-a-uuid"));

    expect(await db.orm.public.ProcessedPaymentEvent.all()).toHaveLength(1);
  });

  it("leaves a succeeded payment alone", async () => {
    const payment = await createOurPayment();
    await db.orm.public.Payment.where((candidate) =>
      candidate.id.eq(payment.id),
    ).update({ status: "succeeded" });

    await service.expireCheckout(expiredCheckout(payment.id));

    expect(await paymentStatus(payment.id)).toBe("succeeded");
  });

  it("ignores a late completed event, granting no access", async () => {
    const payment = await createOurPayment();
    await service.expireCheckout(expiredCheckout(payment.id));

    const fulfillment = new FulfillmentService(
      new PrismaService(),
      new PaymentsRepository(),
      new EnrollmentsRepository(),
      new EmailOutboxRepository(),
      undefined as unknown as StripeService,
    );
    await fulfillment.fulfillCheckout({
      event: {
        provider: "stripe",
        eventId: `evt_test_${crypto.randomUUID()}`,
        type: "checkout.session.completed",
      },
      paymentId: payment.id,
      providerCheckoutId: "cs_test_1",
      providerPayment: {
        id: "pi_test_1",
        paidAt: Temporal.Instant.from("2026-10-21T12:00:00Z"),
      },
    });

    expect(await paymentStatus(payment.id)).toBe("expired");
    expect(await db.orm.public.Enrollment.all()).toEqual([]);
  });
});
