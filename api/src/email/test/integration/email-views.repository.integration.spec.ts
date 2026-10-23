import { describe, expect, it } from "vitest";

import { EmailViewsRepository } from "@/email/email-views.repository.js";
import { db } from "@/prisma/db.js";
import {
  createCustomer,
  createPayment,
  createPricedCourse,
} from "@/test/course-fixtures.js";

describe("EmailViewsRepository (integration)", () => {
  const repository = new EmailViewsRepository();

  it("finds the course details a template shows", async () => {
    const { course } = await createPricedCourse({ title: "Intro to Rust" });

    const found = await repository.findCourse(db, course.id);

    expect(found).toMatchObject({
      title: "Intro to Rust",
      contentUrl: course.contentUrl,
      timeZone: course.timeZone,
    });
  });

  it("finds a payment with its customer and course", async () => {
    const { course, price } = await createPricedCourse();
    const customer = await createCustomer({ email: "ada@example.com" });
    const payment = await createPayment({
      customerId: customer.id,
      coursePriceId: price.id,
      amount: 9900,
      currency: "USD",
    });

    expect(await repository.findDisputedPayment(db, payment.id)).toEqual({
      payment: { id: payment.id, amount: 9900, currency: "USD" },
      courseId: course.id,
      customer: { email: "ada@example.com" },
    });
  });

  it("returns null for ids that don't exist", async () => {
    const missing = crypto.randomUUID();

    expect(await repository.findCourse(db, missing)).toBeNull();
    expect(await repository.findDisputedPayment(db, missing)).toBeNull();
  });
});
