import { Temporal } from "@js-temporal/polyfill";
import { beforeEach, describe, expect, it } from "vitest";

import { CheckoutRepository } from "@/checkout/checkout.repository.js";
import { db } from "@/prisma/db.js";
import {
  archiveCourse,
  createCourse,
  createCoursePrice,
} from "@/test/course-fixtures.js";

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

  describe("findVisibleCourse", () => {
    const now = Temporal.Now.instant();

    function addPrice(amount: number, effectiveAt: Temporal.Instant) {
      return createCoursePrice({
        courseId,
        amount,
        currency: "USD",
        effectiveAt,
      });
    }

    it("returns the course with the latest price already in effect", async () => {
      await addPrice(7900, now.subtract({ hours: 48 }));
      const current = await addPrice(9900, now.subtract({ hours: 1 }));
      await addPrice(12900, now.add({ hours: 1 }));

      expect(await repository.findVisibleCourse(db, courseId, now)).toEqual({
        id: courseId,
        title: "React Fundamentals",
        endsAt: expect.any(Temporal.Instant),
        currentPrice: { id: current.id, amount: 9900, currency: "USD" },
      });
    });

    it("returns null before any price takes effect", async () => {
      await addPrice(9900, now.add({ hours: 1 }));

      expect(await repository.findVisibleCourse(db, courseId, now)).toBeNull();
    });

    it("returns null for an archived course", async () => {
      await addPrice(9900, now.subtract({ hours: 1 }));
      await archiveCourse(courseId, now.subtract({ minutes: 1 }));

      expect(await repository.findVisibleCourse(db, courseId, now)).toBeNull();
    });

    it("returns null for a course that doesn't exist", async () => {
      expect(
        await repository.findVisibleCourse(db, crypto.randomUUID(), now),
      ).toBeNull();
    });
  });

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
});
