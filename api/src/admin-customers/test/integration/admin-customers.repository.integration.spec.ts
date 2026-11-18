import { Temporal } from "@js-temporal/polyfill";
import { beforeEach, describe, expect, it } from "vitest";

import { AdminCustomersRepository } from "@/admin-customers/admin-customers.repository.js";
import { db } from "@/prisma/db.js";
import {
  createCustomer,
  createEnrollment,
  createPendingPayment,
  createPricedCourse,
  updateCourseStatus,
} from "@/test/course-fixtures.js";
import { instant } from "@/test/test-helpers.js";

describe("AdminCustomersRepository (integration)", () => {
  const repository = new AdminCustomersRepository();

  let course: { id: string; title: string };
  let price: { id: string; amount: number; currency: string };

  beforeEach(async () => {
    const priced = await createPricedCourse();

    course = priced.course;
    price = priced.price;
  });

  function createCheckout(customerId: string, createdAt: string) {
    return createPendingPayment({
      customerId,
      coursePriceId: price.id,
      amount: price.amount,
      currency: price.currency,
      createdAt: instant(createdAt),
    });
  }

  function createCustomerWithId(id: string, createdAt: Temporal.Instant) {
    return db.orm.public.Customer.create({
      id,
      name: `test-${id}`,
      email: `${id}@example.com`,
      createdAt,
    });
  }

  it("gives each customer with two checkouts their own newer checkout's time", async () => {
    const older = await createCustomer({
      createdAt: instant("2026-09-01T00:00:00.000Z"),
    });
    const newer = await createCustomer({
      createdAt: instant("2026-09-02T00:00:00.000Z"),
    });
    await createCheckout(older.id, "2026-09-02T00:00:00.000Z");
    await createCheckout(older.id, "2026-09-03T00:00:00.000Z");
    await createCheckout(newer.id, "2026-09-04T00:00:00.000Z");
    await createCheckout(newer.id, "2026-09-05T00:00:00.000Z");

    expect(await repository.findAllCustomersWithEnrollments(db)).toEqual([
      {
        id: newer.id,
        name: newer.name,
        email: newer.email,
        latestCheckoutStartedAt: instant("2026-09-05T00:00:00.000Z"),
        enrollments: [],
      },
      {
        id: older.id,
        name: older.name,
        email: older.email,
        latestCheckoutStartedAt: instant("2026-09-03T00:00:00.000Z"),
        enrollments: [],
      },
    ]);
  });

  it("gives every enrollment with its course and its three times", async () => {
    const otherCourse = (await createPricedCourse({ title: "Advanced React" }))
      .course;
    const customer = await createCustomer({});
    await createEnrollment({
      courseId: course.id,
      customerId: customer.id,
      purchasedAt: instant("2026-09-02T00:00:00.000Z"),
      revokedAt: instant("2026-09-04T00:00:00.000Z"),
    });
    await createEnrollment({
      courseId: otherCourse.id,
      customerId: customer.id,
      purchasedAt: instant("2026-09-03T00:00:00.000Z"),
      suspendedAt: instant("2026-09-05T00:00:00.000Z"),
    });

    const [row] = await repository.findAllCustomersWithEnrollments(db);

    expect(row?.enrollments).toEqual([
      {
        purchasedAt: instant("2026-09-03T00:00:00.000Z"),
        revokedAt: null,
        suspendedAt: instant("2026-09-05T00:00:00.000Z"),
        course: { id: otherCourse.id, title: "Advanced React" },
      },
      {
        purchasedAt: instant("2026-09-02T00:00:00.000Z"),
        revokedAt: instant("2026-09-04T00:00:00.000Z"),
        suspendedAt: null,
        course: { id: course.id, title: course.title },
      },
    ]);
  });

  it("includes an enrollment in a deleted course", async () => {
    const liveCourse = (await createPricedCourse({ title: "Advanced React" }))
      .course;
    const customer = await createCustomer({});
    await createEnrollment({
      courseId: course.id,
      customerId: customer.id,
      purchasedAt: instant("2026-09-02T00:00:00.000Z"),
    });
    await createEnrollment({
      courseId: liveCourse.id,
      customerId: customer.id,
      purchasedAt: instant("2026-09-03T00:00:00.000Z"),
    });
    await updateCourseStatus(
      course.id,
      "deleted",
      instant("2026-09-10T00:00:00.000Z"),
    );

    const [row] = await repository.findAllCustomersWithEnrollments(db);

    expect(row?.enrollments.map((enrollment) => enrollment.course)).toEqual([
      { id: liveCourse.id, title: "Advanced React" },
      { id: course.id, title: course.title },
    ]);
  });

  it("gives a customer with only free courses a null checkout time", async () => {
    const customer = await createCustomer({});
    await createEnrollment({ courseId: course.id, customerId: customer.id });

    const [row] = await repository.findAllCustomersWithEnrollments(db);

    expect(row?.latestCheckoutStartedAt).toBeNull();
  });

  it("lists the newest customer first and breaks ties by id", async () => {
    const sameTime = instant("2026-09-02T00:00:00.000Z");
    const oldest = await createCustomer({
      createdAt: instant("2026-09-01T00:00:00.000Z"),
    });
    // fixed ids, inserted lowest first, so an order without the id tie-break fails
    await createCustomerWithId(
      "00000000-0000-4000-8000-000000000001",
      sameTime,
    );
    await createCustomerWithId(
      "00000000-0000-4000-8000-000000000002",
      sameTime,
    );

    const rows = await repository.findAllCustomersWithEnrollments(db);

    expect(rows.map((row) => row.id)).toEqual([
      "00000000-0000-4000-8000-000000000002",
      "00000000-0000-4000-8000-000000000001",
      oldest.id,
    ]);
  });

  it("returns an empty list when there are no customers", async () => {
    expect(await repository.findAllCustomersWithEnrollments(db)).toEqual([]);
  });
});
