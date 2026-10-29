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

describe("PaymentsRepository (integration)", () => {
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

  function findPaymentRow(paymentId: string) {
    return db.orm.public.Payment.where((payment) =>
      payment.id.eq(paymentId),
    ).first();
  }

  async function createExpiredPayment() {
    const payment = await createPendingPayment(paymentFields());

    await db.orm.public.Payment.where((candidate) =>
      candidate.id.eq(payment.id),
    ).update({ status: "expired" });

    return findPaymentRow(payment.id);
  }

  describe("findOrphanPayments", () => {
    it("finds a paid payment that no enrollment points to", async () => {
      const payment = await createPayment(paymentFields());

      expect(await repository.findOrphanPayments(db, 10)).toEqual([
        {
          id: payment.id,
          courseId,
          customerId: customer.id,
          providerPaymentId: payment.providerPaymentId,
        },
      ]);
    });

    it("skips a payment an enrollment points to", async () => {
      const payment = await createPayment(paymentFields());
      await createEnrollment({
        courseId,
        customerId: customer.id,
        paymentId: payment.id,
      });

      expect(await repository.findOrphanPayments(db, 10)).toEqual([]);
    });

    it("skips payments that are pending, expired or refunded", async () => {
      await createPendingPayment(paymentFields());
      await createExpiredPayment();
      const refunded = await createPayment(paymentFields());
      await repository.markPaymentRefunded(db, refunded.id, paidAt);

      expect(await repository.findOrphanPayments(db, 10)).toEqual([]);
    });

    it("takes the oldest payments first, up to the limit", async () => {
      const newer = await createPayment({
        ...paymentFields(),
        paidAt: Temporal.Instant.from("2026-10-21T12:00:00Z"),
      });
      const older = await createPayment({
        ...paymentFields(),
        paidAt: Temporal.Instant.from("2026-10-20T12:00:00Z"),
      });
      await createPayment({
        ...paymentFields(),
        paidAt: Temporal.Instant.from("2026-10-22T12:00:00Z"),
      });

      const found = await repository.findOrphanPayments(db, 2);

      expect(found.map((payment) => payment.id)).toEqual([older.id, newer.id]);
    });
  });

  describe("findStalePendingPayments", () => {
    const now = Temporal.Instant.from("2026-10-26T12:00:00Z");
    const window = {
      startedAfter: now.subtract({ hours: 7 * 24 }),
      startedBefore: now.subtract({ hours: 1 }),
    };

    function pendingPaymentStartedHoursAgo(
      hours: number,
      providerCheckoutId = `cs_test_${crypto.randomUUID()}`,
    ) {
      return createPendingPayment({
        ...paymentFields(),
        providerCheckoutId,
        createdAt: now.subtract({ hours }),
      });
    }

    it("finds a pending payment inside the window", async () => {
      const payment = await pendingPaymentStartedHoursAgo(2, "cs_test_inside");

      expect(await repository.findStalePendingPayments(db, window, 10)).toEqual(
        [{ id: payment.id, providerCheckoutId: "cs_test_inside" }],
      );
    });

    it("skips a payment that is too new or too old", async () => {
      await pendingPaymentStartedHoursAgo(0);
      await pendingPaymentStartedHoursAgo(8 * 24);

      expect(await repository.findStalePendingPayments(db, window, 10)).toEqual(
        [],
      );
    });

    it("skips a payment without a checkout, and ones no longer pending", async () => {
      await createPendingPayment({
        ...paymentFields(),
        createdAt: now.subtract({ hours: 2 }),
      });
      await createExpiredPayment();

      expect(await repository.findStalePendingPayments(db, window, 10)).toEqual(
        [],
      );
    });

    it("takes the oldest first, up to the limit", async () => {
      await pendingPaymentStartedHoursAgo(2);
      const oldest = await pendingPaymentStartedHoursAgo(50);
      const older = await pendingPaymentStartedHoursAgo(10);

      const found = await repository.findStalePendingPayments(db, window, 2);

      expect(found.map((payment) => payment.id)).toEqual([oldest.id, older.id]);
    });
  });

  describe("expirePaymentsWithoutCheckout", () => {
    const now = Temporal.Instant.from("2026-10-26T12:00:00Z");
    const startedBefore = now.subtract({ hours: 72 });

    function startedHoursAgo(hours: number, providerCheckoutId?: string) {
      return createPendingPayment({
        ...paymentFields(),
        providerCheckoutId,
        createdAt: now.subtract({ hours }),
      });
    }

    it("expires an old pending payment that has no checkout", async () => {
      const payment = await startedHoursAgo(100);

      expect(
        await repository.expirePaymentsWithoutCheckout(db, startedBefore),
      ).toBe(1);
      expect(await findPaymentRow(payment.id)).toMatchObject({
        status: "expired",
      });
    });

    it("leaves a payment that is too new, or has a checkout", async () => {
      const tooNew = await startedHoursAgo(10);
      const hasCheckout = await startedHoursAgo(100, "cs_test_1");

      expect(
        await repository.expirePaymentsWithoutCheckout(db, startedBefore),
      ).toBe(0);
      expect(await findPaymentRow(tooNew.id)).toEqual(tooNew);
      expect(await findPaymentRow(hasCheckout.id)).toEqual(hasCheckout);
    });

    it("leaves a payment that already succeeded alone", async () => {
      const payment = await createPayment(paymentFields());

      expect(await repository.expirePaymentsWithoutCheckout(db, now)).toBe(0);
      expect(await findPaymentRow(payment.id)).toEqual(payment);
    });
  });
});
