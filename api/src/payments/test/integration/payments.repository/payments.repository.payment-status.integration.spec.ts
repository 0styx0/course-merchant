import { Temporal } from "@js-temporal/polyfill";
import { beforeEach, describe, expect, it } from "vitest";

import { PaymentsRepository } from "@/payments/payments.repository.js";
import { db } from "@/prisma/db.js";
import {
  createCustomer,
  createPayment,
  createPendingPayment,
  createPricedCourse,
} from "@/test/course-fixtures.js";

describe("PaymentsRepository (integration)", () => {
  const repository = new PaymentsRepository();

  const paidAt = Temporal.Instant.from("2026-10-21T12:00:00Z");

  let price: { id: string; amount: number; currency: string };
  let customer: { id: string; email: string };

  beforeEach(async () => {
    const pricedCourse = await createPricedCourse();
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

  function paidFields(paymentId: string) {
    return {
      id: paymentId,
      providerCheckoutId: `cs_test_${crypto.randomUUID()}`,
      providerPaymentId: `pi_test_${crypto.randomUUID()}`,
      paidAt,
    };
  }

  async function createExpiredPayment() {
    const payment = await createPendingPayment(paymentFields());

    await db.orm.public.Payment.where((candidate) =>
      candidate.id.eq(payment.id),
    ).update({ status: "expired" });

    return findPaymentRow(payment.id);
  }

  describe("markPaymentSucceeded", () => {
    it("marks a pending payment as paid", async () => {
      const payment = await createPendingPayment({
        ...paymentFields(),
        providerCheckoutId: "cs_test_saved",
      });
      const paid = {
        ...paidFields(payment.id),
        providerCheckoutId: "cs_test_saved",
      };

      expect(await repository.markPaymentSucceeded(db, paid)).toBe(true);
      expect(await findPaymentRow(payment.id)).toMatchObject({
        status: "succeeded",
        providerCheckoutId: paid.providerCheckoutId,
        providerPaymentId: paid.providerPaymentId,
        paidAt,
      });
    });

    it("fills in the checkout id when saving it at checkout failed", async () => {
      const payment = await createPendingPayment(paymentFields());
      const paid = paidFields(payment.id);

      await repository.markPaymentSucceeded(db, paid);

      expect(await findPaymentRow(payment.id)).toMatchObject({
        providerCheckoutId: paid.providerCheckoutId,
      });
    });

    it("leaves a payment that already succeeded alone", async () => {
      const payment = await createPayment(paymentFields());

      expect(
        await repository.markPaymentSucceeded(db, paidFields(payment.id)),
      ).toBe(false);
      expect(await findPaymentRow(payment.id)).toEqual(payment);
    });

    it("leaves an expired payment alone", async () => {
      const payment = await createExpiredPayment();

      expect(
        await repository.markPaymentSucceeded(db, paidFields(payment!.id)),
      ).toBe(false);
      expect(await findPaymentRow(payment!.id)).toEqual(payment);
    });

    it("lets only one of two concurrent fulfillments through", async () => {
      const payment = await createPendingPayment(paymentFields());
      const paid = paidFields(payment.id);

      const results = await Promise.all([
        repository.markPaymentSucceeded(db, paid),
        repository.markPaymentSucceeded(db, paid),
      ]);

      expect(results.filter(Boolean)).toHaveLength(1);
    });
  });

  describe("markPaymentExpired", () => {
    it("expires a pending payment", async () => {
      const payment = await createPendingPayment(paymentFields());

      expect(await repository.markPaymentExpired(db, payment.id)).toBe(true);
      expect(await findPaymentRow(payment.id)).toMatchObject({
        status: "expired",
      });
    });

    it("leaves a payment that already succeeded alone", async () => {
      const payment = await createPayment(paymentFields());

      expect(await repository.markPaymentExpired(db, payment.id)).toBe(false);
      expect(await findPaymentRow(payment.id)).toEqual(payment);
    });
  });

  describe("markPaymentRefunded", () => {
    const refundedAt = Temporal.Instant.from("2026-10-22T12:00:00Z");

    it("marks a paid payment refunded", async () => {
      const payment = await createPayment(paymentFields());

      expect(
        await repository.markPaymentRefunded(db, payment.id, refundedAt),
      ).toBe(true);
      expect(await findPaymentRow(payment.id)).toMatchObject({
        status: "refunded",
        refundedAt,
      });
    });

    it("leaves a payment that is already refunded alone", async () => {
      const payment = await createPayment(paymentFields());
      await repository.markPaymentRefunded(db, payment.id, refundedAt);
      const refunded = await findPaymentRow(payment.id);

      expect(
        await repository.markPaymentRefunded(
          db,
          payment.id,
          Temporal.Instant.from("2026-10-23T12:00:00Z"),
        ),
      ).toBe(false);
      expect(await findPaymentRow(payment.id)).toEqual(refunded);
    });

    it("leaves a pending payment alone", async () => {
      const payment = await createPendingPayment(paymentFields());

      expect(
        await repository.markPaymentRefunded(db, payment.id, refundedAt),
      ).toBe(false);
      expect(await findPaymentRow(payment.id)).toEqual(payment);
    });
  });
});
