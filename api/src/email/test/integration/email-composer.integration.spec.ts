import { describe, expect, it } from "vitest";

import { EmailComposer } from "@/email/email-composer.js";
import type { OutboxEmail } from "@/email/outbox/email-outbox.repository.js";
import { EmailViewsRepository } from "@/email/outbox/email-views.repository.js";
import { PrismaService } from "@/prisma/prisma.service.js";
import {
  createCustomer,
  createPayment,
  createPricedCourse,
} from "@/test/course-fixtures.js";

describe("EmailComposer (integration)", () => {
  const composer = new EmailComposer(
    new PrismaService(),
    new EmailViewsRepository(),
    {
      smtpUrl: "smtp://localhost",
      requireTls: false,
      from: "Course Shop <hello@example.com>",
      shopName: "Course Shop",
    },
  );

  const queued = (kind: OutboxEmail["kind"], payload: object) =>
    ({ kind, recipient: "x@example.com", payload }) as OutboxEmail;

  it("composes each kind from the ids in its payload", async () => {
    const { course, price } = await createPricedCourse({ title: "Rust 101" });
    const customer = await createCustomer({ name: "Ada" });
    const payment = await createPayment({
      customerId: customer.id,
      coursePriceId: price.id,
      amount: 9900,
      currency: "USD",
    });
    const ids = { courseId: course.id, customerId: customer.id };

    const subjects = await Promise.all(
      [
        queued("access_granted", ids),
        queued("already_owned", { ...ids, refundIssued: true }),
        queued("access_suspended", { ...ids, refundIssued: true }),
        queued("dispute_alert", { paymentId: payment.id }),
      ].map(async (email) => (await composer.compose(email)).subject),
    );

    expect(subjects).toEqual([
      "You're in: Rust 101",
      "You already have Rust 101",
      "Your access to Rust 101 is suspended",
      "Payment dispute: Rust 101",
    ]);
  });

  it("greets buyers without the customer's name", async () => {
    const { course } = await createPricedCourse();
    const customer = await createCustomer({ name: "Mallory <b>" });

    const { text } = await composer.compose(
      queued("access_granted", {
        courseId: course.id,
        customerId: customer.id,
      }),
    );

    expect(text).not.toContain("Mallory");
  });

  it("throws when a course or payment no longer exists", async () => {
    await expect(
      composer.compose(
        queued("access_granted", {
          courseId: crypto.randomUUID(),
          customerId: crypto.randomUUID(),
        }),
      ),
    ).rejects.toThrow("course no longer exists");
    await expect(
      composer.compose(
        queued("dispute_alert", { paymentId: crypto.randomUUID() }),
      ),
    ).rejects.toThrow("disputed payment no longer exists");
  });

  it("throws when the payload doesn't match its kind", async () => {
    await expect(
      composer.compose(queued("already_owned", { courseId: "c1" })),
    ).rejects.toThrow(
      "already_owned payload is invalid (customerId, refundIssued)",
    );
  });
});
