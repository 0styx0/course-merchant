import { Temporal } from "@js-temporal/polyfill";
import { beforeEach, describe, expect, it } from "vitest";

import { EnrollmentsRepository } from "@/enrollments/enrollments.repository.js";
import { db } from "@/prisma/db.js";
import {
  createCourse,
  createCoursePrice,
  createCustomer,
  createPayment,
} from "@/test/course-fixtures.js";

describe("EnrollmentsRepository (integration)", () => {
  const repository = new EnrollmentsRepository();

  let courseId: string;

  beforeEach(async () => {
    const now = Temporal.Now.instant();
    const course = await createCourse({
      title: "React Fundamentals",
      description: "Learn React",
      startsAt: now.add({ hours: 24 }),
      endsAt: now.add({ hours: 26 }),
      timeZone: "UTC",
    });

    courseId = course.id;
  });

  function enroll(
    customerId: string,
    fields: {
      revokedAt?: Temporal.Instant;
      suspendedAt?: Temporal.Instant;
    } = {},
  ) {
    return db.orm.public.Enrollment.create({ courseId, customerId, ...fields });
  }

  function findEnrollmentRow(customerId: string) {
    return db.orm.public.Enrollment.where((enrollment) =>
      enrollment.customerId.eq(customerId),
    ).first();
  }

  const now = Temporal.Instant.from("2026-10-21T12:00:00Z");

  function freeAccess(customerId: string) {
    return { courseId, customerId, paymentId: null, now };
  }

  async function createPaymentFor(customerId: string) {
    const price = await createCoursePrice({
      courseId,
      amount: 9900,
      currency: "USD",
      effectiveAt: now.subtract({ hours: 1 }),
    });

    return createPayment({
      customerId,
      coursePriceId: price.id,
      amount: price.amount,
      currency: price.currency,
    });
  }

  describe("findEnrollment", () => {
    it("returns null when the customer isn't enrolled", async () => {
      const customer = await createCustomer({});

      expect(
        await repository.findEnrollment(db, courseId, customer.id),
      ).toBeNull();
    });

    it("returns the enrollment's access timestamps", async () => {
      const customer = await createCustomer({});
      const revokedAt = Temporal.Instant.from("2026-10-20T12:00:00Z");
      const enrollment = await enroll(customer.id, { revokedAt });

      expect(
        await repository.findEnrollment(db, courseId, customer.id),
      ).toEqual({ id: enrollment.id, revokedAt, suspendedAt: null });
    });
  });

  describe("grantAccess", () => {
    it("enrolls a new customer", async () => {
      const customer = await createCustomer({});

      expect(await repository.grantAccess(db, freeAccess(customer.id))).toBe(
        true,
      );
      expect(await findEnrollmentRow(customer.id)).toMatchObject({
        courseId,
        paymentId: null,
        revokedAt: null,
        suspendedAt: null,
      });
    });

    it("isn't blocked by another customer's enrollment in the same course", async () => {
      const otherCustomer = await createCustomer({});
      const customer = await createCustomer({});
      await enroll(otherCustomer.id);

      expect(await repository.grantAccess(db, freeAccess(customer.id))).toBe(
        true,
      );
    });

    it("leaves an active enrollment alone", async () => {
      const customer = await createCustomer({});
      const enrollment = await enroll(customer.id);

      expect(await repository.grantAccess(db, freeAccess(customer.id))).toBe(
        false,
      );
      expect(await findEnrollmentRow(customer.id)).toEqual(enrollment);
    });

    it("reactivates an enrollment a refund revoked", async () => {
      const customer = await createCustomer({});
      await enroll(customer.id, {
        revokedAt: Temporal.Instant.from("2026-10-01T00:00:00Z"),
      });

      expect(await repository.grantAccess(db, freeAccess(customer.id))).toBe(
        true,
      );
      expect(await findEnrollmentRow(customer.id)).toMatchObject({
        paymentId: null,
        revokedAt: null,
        purchasedAt: now,
      });
    });

    it.each([
      [
        "suspended",
        { suspendedAt: Temporal.Instant.from("2026-10-01T00:00:00Z") },
      ],
      [
        "suspended and revoked",
        {
          revokedAt: Temporal.Instant.from("2026-10-01T00:00:00Z"),
          suspendedAt: Temporal.Instant.from("2026-10-02T00:00:00Z"),
        },
      ],
    ])("doesn't restore a %s enrollment", async (_label, fields) => {
      const customer = await createCustomer({});
      const enrollment = await enroll(customer.id, fields);

      expect(await repository.grantAccess(db, freeAccess(customer.id))).toBe(
        false,
      );
      expect(await findEnrollmentRow(customer.id)).toEqual(enrollment);
    });

    it("grants access once when the same request arrives twice at once", async () => {
      const customer = await createCustomer({});

      const results = await Promise.all([
        repository.grantAccess(db, freeAccess(customer.id)),
        repository.grantAccess(db, freeAccess(customer.id)),
      ]);

      expect(results.filter(Boolean)).toHaveLength(1);
    });
  });

  describe("grantAccess for a payment", () => {
    it("records the payment that bought access", async () => {
      const customer = await createCustomer({});
      const payment = await createPaymentFor(customer.id);

      expect(
        await repository.grantAccess(db, {
          ...freeAccess(customer.id),
          paymentId: payment.id,
        }),
      ).toBe(true);
      expect(await findEnrollmentRow(customer.id)).toMatchObject({
        paymentId: payment.id,
        purchasedAt: now,
      });
    });

    it("points a reactivated enrollment at the new payment", async () => {
      const customer = await createCustomer({});
      await enroll(customer.id, {
        revokedAt: Temporal.Instant.from("2026-10-01T00:00:00Z"),
      });
      const payment = await createPaymentFor(customer.id);

      expect(
        await repository.grantAccess(db, {
          ...freeAccess(customer.id),
          paymentId: payment.id,
        }),
      ).toBe(true);
      expect(await findEnrollmentRow(customer.id)).toMatchObject({
        paymentId: payment.id,
        revokedAt: null,
      });
    });
  });
});
