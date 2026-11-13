import { Temporal } from "@js-temporal/polyfill";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AdminEnrollmentsService } from "@/admin-enrollments/admin-enrollments.service.js";
import { EnrollmentsRepository } from "@/enrollments/enrollments.repository.js";
import { PaymentsRepository } from "@/payments/payments.repository.js";
import { DatabaseClock } from "@/prisma/database-clock.js";
import { db } from "@/prisma/db.js";
import { PrismaService } from "@/prisma/prisma.service.js";
import {
  createCustomer,
  createEnrollment,
  createPayment,
  createPricedCourse,
} from "@/test/course-fixtures.js";

describe("AdminEnrollmentsService (integration)", () => {
  const paymentsRepository = new PaymentsRepository();
  const service = new AdminEnrollmentsService(
    new PrismaService(),
    new EnrollmentsRepository(),
    paymentsRepository,
    new DatabaseClock(),
  );

  let courseId: string;
  let price: { id: string; amount: number; currency: string };
  let customerId: string;

  beforeEach(async () => {
    const priced = await createPricedCourse();

    courseId = priced.course.id;
    price = priced.price;
    customerId = (await createCustomer({})).id;
  });

  function createPaidPayment() {
    return createPayment({
      customerId,
      coursePriceId: price.id,
      amount: price.amount,
      currency: price.currency,
    });
  }

  function findEnrollmentRow() {
    return db.orm.public.Enrollment.where((enrollment) =>
      enrollment.customerId.eq(customerId),
    ).first();
  }

  function findPaymentRow(paymentId: string) {
    return db.orm.public.Payment.where((payment) =>
      payment.id.eq(paymentId),
    ).first();
  }

  it("revokes a paid enrollment and records its payment as refunded", async () => {
    const payment = await createPaidPayment();
    await createEnrollment({ courseId, customerId, paymentId: payment.id });

    expect(await service.unenroll(courseId, customerId)).toBe("unenrolled");

    const enrollment = await findEnrollmentRow();
    const refundedPayment = await findPaymentRow(payment.id);

    expect(enrollment?.revokedAt).toBeInstanceOf(Temporal.Instant);
    expect(refundedPayment).toMatchObject({
      status: "refunded",
      refundedAt: enrollment?.revokedAt,
    });
  });

  it("revokes a free enrollment and leaves the customer's other payment alone", async () => {
    const otherPayment = await createPaidPayment();
    await createEnrollment({ courseId, customerId });

    expect(await service.unenroll(courseId, customerId)).toBe("unenrolled");
    expect((await findEnrollmentRow())?.revokedAt).toBeInstanceOf(
      Temporal.Instant,
    );
    expect(await findPaymentRow(otherPayment.id)).toMatchObject({
      status: "succeeded",
      refundedAt: null,
    });
  });

  it("keeps the first revokedAt when called again", async () => {
    await createEnrollment({ courseId, customerId });
    await service.unenroll(courseId, customerId);
    const firstRevokedAt = (await findEnrollmentRow())?.revokedAt;

    expect(await service.unenroll(courseId, customerId)).toBe(
      "already_unenrolled",
    );
    expect((await findEnrollmentRow())?.revokedAt).toEqual(firstRevokedAt);
  });

  it("reports a missing enrollment", async () => {
    expect(await service.unenroll(courseId, customerId)).toBe("not_found");
  });

  it("revokes the enrollment but leaves a payment that isn't succeeded as it is", async () => {
    const payment = await createPaidPayment();
    await db.orm.public.Payment.where((candidate) =>
      candidate.id.eq(payment.id),
    ).update({ status: "expired" });
    await createEnrollment({ courseId, customerId, paymentId: payment.id });

    expect(await service.unenroll(courseId, customerId)).toBe("unenrolled");
    expect((await findEnrollmentRow())?.revokedAt).toBeInstanceOf(
      Temporal.Instant,
    );
    expect(await findPaymentRow(payment.id)).toMatchObject({
      status: "expired",
      refundedAt: null,
    });
  });

  it("rolls back the revocation when recording the refund fails", async () => {
    const payment = await createPaidPayment();
    await createEnrollment({ courseId, customerId, paymentId: payment.id });
    vi.spyOn(paymentsRepository, "markPaymentRefunded").mockRejectedValue(
      new Error("db down"),
    );

    await expect(service.unenroll(courseId, customerId)).rejects.toThrow(
      "db down",
    );
    expect((await findEnrollmentRow())?.revokedAt).toBeNull();
  });
});
