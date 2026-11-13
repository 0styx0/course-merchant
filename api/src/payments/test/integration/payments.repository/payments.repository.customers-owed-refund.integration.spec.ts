import { Temporal } from "@js-temporal/polyfill";
import { beforeEach, describe, expect, it } from "vitest";

import { PaymentsRepository } from "@/payments/payments.repository.js";
import { db } from "@/prisma/db.js";
import {
  createCustomer,
  createEnrollment,
  createPayment,
  createPendingPayment,
  createPricedCourse,
} from "@/test/course-fixtures.js";

describe("PaymentsRepository customers owed a refund (integration)", () => {
  const repository = new PaymentsRepository();

  const paidAt = Temporal.Instant.from("2026-10-21T12:00:00Z");

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

  describe("findCustomersOwedRefund", () => {
    it("returns the buyer of a paid payment that no enrollment points to, for the asked course", async () => {
      await createPayment(paymentFields());

      expect(await repository.findCustomersOwedRefund(db, [courseId])).toEqual([
        { courseId, customerId: customer.id },
      ]);
    });

    it("skips a buyer whose only payment an enrollment points to", async () => {
      const payment = await createPayment(paymentFields());
      await createEnrollment({
        courseId,
        customerId: customer.id,
        paymentId: payment.id,
      });

      expect(await repository.findCustomersOwedRefund(db, [courseId])).toEqual(
        [],
      );
    });

    it("skips a free student, who has no payment at all", async () => {
      await createEnrollment({ courseId, customerId: customer.id });

      expect(await repository.findCustomersOwedRefund(db, [courseId])).toEqual(
        [],
      );
    });

    it("skips an orphan payment made for another course", async () => {
      const otherCourse = await createPricedCourse();
      await createPayment({
        ...paymentFields(),
        coursePriceId: otherCourse.price.id,
      });

      expect(await repository.findCustomersOwedRefund(db, [courseId])).toEqual(
        [],
      );
    });

    it("skips a payment that is still pending", async () => {
      await createPendingPayment(paymentFields());

      expect(await repository.findCustomersOwedRefund(db, [courseId])).toEqual(
        [],
      );
    });

    it("skips a payment that was already refunded", async () => {
      const payment = await createPayment(paymentFields());
      await repository.markPaymentRefunded(db, payment.id, paidAt);

      expect(await repository.findCustomersOwedRefund(db, [courseId])).toEqual(
        [],
      );
    });

    it("returns a buyer once per course, even with several orphan payments", async () => {
      await createPayment(paymentFields());
      await createPayment(paymentFields());

      expect(await repository.findCustomersOwedRefund(db, [courseId])).toEqual([
        { courseId, customerId: customer.id },
      ]);
    });

    it("returns the buyers of several courses in one call", async () => {
      const otherCourse = await createPricedCourse();
      await createPayment(paymentFields());
      await createPayment({
        ...paymentFields(),
        coursePriceId: otherCourse.price.id,
      });

      const buyers = await repository.findCustomersOwedRefund(db, [
        courseId,
        otherCourse.course.id,
      ]);

      expect(buyers).toHaveLength(2);
      expect(buyers).toEqual(
        expect.arrayContaining([
          { courseId, customerId: customer.id },
          { courseId: otherCourse.course.id, customerId: customer.id },
        ]),
      );
    });
  });
});
