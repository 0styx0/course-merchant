import { Temporal } from "@js-temporal/polyfill";
import { beforeEach, describe, expect, it } from "vitest";

import { CheckoutRepository } from "@/checkout/checkout.repository.js";
import { db } from "@/prisma/db.js";
import { createCourse, createCustomer } from "@/test/course-fixtures.js";

describe("CheckoutRepository (integration)", () => {
  const repository = new CheckoutRepository();

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
    fields: { revokedAt?: Temporal.Instant; suspendedAt?: Temporal.Instant } = {},
  ) {
    return db.orm.public.Enrollment.create({ courseId, customerId, ...fields });
  }

  function findEnrollmentRow(customerId: string) {
    return db.orm.public.Enrollment
      .where((enrollment) => enrollment.customerId.eq(customerId))
      .first();
  }

  describe("findOrCreateCustomer", () => {
    it("creates a customer", async () => {
      const customer = await repository.findOrCreateCustomer(db, {
        email: "ada@example.com",
        name: "Ada Lovelace",
      });

      expect(customer).toEqual({
        id: expect.any(String),
        email: "ada@example.com",
        name: "Ada Lovelace",
      });
    });

    it("returns the existing customer and keeps their name", async () => {
      const first = await repository.findOrCreateCustomer(db, {
        email: "ada@example.com",
        name: "Ada Lovelace",
      });

      const second = await repository.findOrCreateCustomer(db, {
        email: "ada@example.com",
        name: "Augusta Ada King",
      });

      expect(second).toEqual(first);
    });

    it("creates one customer when two checkouts arrive at once", async () => {
      const customers = await Promise.all(
        Array.from({ length: 5 }, () =>
          repository.findOrCreateCustomer(db, {
            email: "ada@example.com",
            name: "Ada Lovelace",
          }),
        ),
      );

      expect(new Set(customers.map((customer) => customer.id)).size).toBe(1);
      expect(await db.orm.public.Customer.all()).toHaveLength(1);
    });
  });

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

  describe("grantFreeAccess", () => {
    const now = Temporal.Instant.from("2026-10-21T12:00:00Z");

    it("enrolls a new customer", async () => {
      const customer = await createCustomer({});

      expect(
        await repository.grantFreeAccess(db, courseId, customer.id, now),
      ).toBe(true);
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

      expect(
        await repository.grantFreeAccess(db, courseId, customer.id, now),
      ).toBe(true);
    });

    it("leaves an active enrollment alone", async () => {
      const customer = await createCustomer({});
      const enrollment = await enroll(customer.id);

      expect(
        await repository.grantFreeAccess(db, courseId, customer.id, now),
      ).toBe(false);
      expect(await findEnrollmentRow(customer.id)).toEqual(enrollment);
    });

    it("reactivates an enrollment a refund revoked", async () => {
      const customer = await createCustomer({});
      await enroll(customer.id, {
        revokedAt: Temporal.Instant.from("2026-10-01T00:00:00Z"),
      });

      expect(
        await repository.grantFreeAccess(db, courseId, customer.id, now),
      ).toBe(true);
      expect(await findEnrollmentRow(customer.id)).toMatchObject({
        paymentId: null,
        revokedAt: null,
        purchasedAt: now,
      });
    });

    it.each([
      ["suspended", { suspendedAt: Temporal.Instant.from("2026-10-01T00:00:00Z") }],
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

      expect(
        await repository.grantFreeAccess(db, courseId, customer.id, now),
      ).toBe(false);
      expect(await findEnrollmentRow(customer.id)).toEqual(enrollment);
    });

    it("grants access once when the same request arrives twice at once", async () => {
      const customer = await createCustomer({});

      const results = await Promise.all([
        repository.grantFreeAccess(db, courseId, customer.id, now),
        repository.grantFreeAccess(db, courseId, customer.id, now),
      ]);

      expect(results.filter(Boolean)).toHaveLength(1);
    });
  });
});
