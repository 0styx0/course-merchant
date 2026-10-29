import { beforeEach, describe, expect, it } from "vitest";

import { PaymentsRepository } from "@/payments/payments.repository.js";
import { db } from "@/prisma/db.js";
import {
  createCustomer,
  createPendingPayment,
  createPricedCourse,
} from "@/test/course-fixtures.js";

describe("PaymentsRepository (integration)", () => {
  const repository = new PaymentsRepository();

  let courseId: string;
  let price: { id: string; amount: number; currency: string };
  let customer: { id: string; email: string };

  beforeEach(async () => {
    const pricedCourse = await createPricedCourse();
    courseId = pricedCourse.course.id;
    price = pricedCourse.price;
    customer = await createCustomer({});
  });

  function paymentFields() {
    return {
      customerId: customer.id,
      coursePriceId: price.id,
      amount: price.amount,
      currency: price.currency,
    };
  }

  function findPaymentRow(paymentId: string) {
    return db.orm.public.Payment.where((payment) =>
      payment.id.eq(paymentId),
    ).first();
  }

  describe("recordProcessedEvent", () => {
    const event = {
      provider: "stripe" as const,
      eventId: "evt_test_1",
      type: "checkout.session.completed",
    };

    it("records an event it hasn't seen", async () => {
      expect(await repository.recordProcessedEvent(db, event)).toBe(true);
      expect(
        await db.orm.public.ProcessedPaymentEvent.where((processed) =>
          processed.eventId.eq(event.eventId),
        ).first(),
      ).toMatchObject(event);
    });

    it("reports a redelivered event as already processed", async () => {
      await repository.recordProcessedEvent(db, event);

      expect(await repository.recordProcessedEvent(db, event)).toBe(false);
    });

    it("records the event once when it's delivered twice at once", async () => {
      const results = await Promise.all([
        repository.recordProcessedEvent(db, event),
        repository.recordProcessedEvent(db, event),
      ]);

      expect(results.filter(Boolean)).toHaveLength(1);
    });
  });

  describe("findPaymentForFulfillment", () => {
    it("returns null for an unknown payment", async () => {
      expect(
        await repository.findPaymentForFulfillment(db, crypto.randomUUID()),
      ).toBeNull();
    });

    it("returns the course and the customer to email", async () => {
      const payment = await createPendingPayment(paymentFields());

      expect(
        await repository.findPaymentForFulfillment(db, payment.id),
      ).toEqual({
        id: payment.id,
        courseId,
        customer: { id: customer.id, email: customer.email },
      });
    });
  });

  describe("pending payments", () => {
    function pendingPaymentInput() {
      return { provider: "stripe" as const, ...paymentFields() };
    }

    it("records a pending payment with no provider ids yet", async () => {
      const input = pendingPaymentInput();

      const pending = await repository.createPendingPayment(db, input);

      expect(pending).toMatchObject({
        id: expect.any(String),
        amount: price.amount,
        currency: price.currency,
      });
      expect(await findPaymentRow(pending.id)).toMatchObject({
        ...input,
        status: "pending",
        providerCheckoutId: null,
        providerPaymentId: null,
        paidAt: null,
      });
    });

    it("finds a payment's status by the provider's checkout id", async () => {
      const pending = await repository.createPendingPayment(
        db,
        pendingPaymentInput(),
      );
      await repository.saveProviderCheckoutId(db, pending.id, "cs_test_123");

      expect(
        await repository.findPaymentStatusByCheckoutId(
          db,
          "stripe",
          "cs_test_123",
        ),
      ).toBe("pending");
      expect(
        await repository.findPaymentStatusByCheckoutId(
          db,
          "stripe",
          "cs_test_other",
        ),
      ).toBeNull();
    });

    it("saves the provider's checkout id on the payment", async () => {
      const pending = await repository.createPendingPayment(
        db,
        pendingPaymentInput(),
      );

      await repository.saveProviderCheckoutId(db, pending.id, "cs_test_123");

      expect(await findPaymentRow(pending.id)).toMatchObject({
        providerCheckoutId: "cs_test_123",
        status: "pending",
      });
    });
  });
});
