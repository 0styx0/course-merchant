import { INestApplication } from "@nestjs/common";
import { Temporal } from "@js-temporal/polyfill";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/prisma/db.js";
import { createPricedCourse } from "@/test/course-fixtures.js";
import { createE2eApp, httpServer } from "../e2e-helpers.js";
import { useStripeMock } from "../stripe-mock.js";

// stripe-mock returns the same canned page for every session
const STRIPE_CHECKOUT_URL = /^https:\/\/checkout\.stripe\.com\//;

describe("POST /v1/checkout-sessions (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createE2eApp(useStripeMock);
  });

  afterAll(async () => {
    await app.close();
  });

  // on sale now: published, a price in effect, ending tomorrow
  function createCourseOnSale(amount: number) {
    const now = Temporal.Now.instant();

    return createPricedCourse(
      {
        title: "React Fundamentals",
        startsAt: now.add({ hours: 24 }),
        endsAt: now.add({ hours: 26 }),
      },
      { amount, currency: "USD", effectiveAt: now.subtract({ hours: 1 }) },
    );
  }

  function startCheckout(body: object) {
    return request(httpServer(app)).post("/v1/checkout-sessions").send(body);
  }

  const customer = { name: "Ada Lovelace", email: "ada@example.com" };

  function queuedEmails() {
    return db.orm.public.EmailOutbox.all();
  }

  describe("a free course", () => {
    it("enrolls the buyer and queues their access email", async () => {
      const { course } = await createCourseOnSale(0);

      const response = await startCheckout({
        courseId: course.id,
        customer,
      }).expect(200);

      expect(response.body).toEqual({ status: "check_email" });
      expect(await db.orm.public.Enrollment.all()).toEqual([
        expect.objectContaining({ courseId: course.id, paymentId: null }),
      ]);
      expect(await queuedEmails()).toEqual([
        expect.objectContaining({
          kind: "access_granted",
          recipient: "ada@example.com",
        }),
      ]);
      expect(await db.orm.public.Payment.all()).toEqual([]);
    });
  });

  describe("a paid course", () => {
    it("redirects to Stripe and records a pending payment", async () => {
      const { course, price } = await createCourseOnSale(9900);

      const response = await startCheckout({
        courseId: course.id,
        customer,
      }).expect(200);

      expect(response.body).toEqual({
        status: "redirect",
        url: expect.stringMatching(STRIPE_CHECKOUT_URL),
      });
      expect(await db.orm.public.Payment.all()).toEqual([
        expect.objectContaining({
          coursePriceId: price.id,
          amount: 9900,
          currency: "USD",
          provider: "stripe",
          status: "pending",
          providerCheckoutId: expect.stringMatching(/^cs_test_/),
        }),
      ]);
      expect(await db.orm.public.Enrollment.all()).toEqual([]);
      expect(await queuedEmails()).toEqual([]);
    });

    it("gives each buyer their own Stripe session", async () => {
      const { course } = await createCourseOnSale(9900);

      await startCheckout({ courseId: course.id, customer }).expect(200);
      await startCheckout({
        courseId: course.id,
        customer: { name: "Grace Hopper", email: "grace@example.com" },
      }).expect(200);

      const sessionIds = (await db.orm.public.Payment.all()).map(
        (payment) => payment.providerCheckoutId,
      );

      expect(new Set(sessionIds).size).toBe(2);
    });
  });

  describe("a buyer who already owns the course", () => {
    it("gets the same response as a new buyer and is emailed their link", async () => {
      const { course } = await createCourseOnSale(0);
      await startCheckout({ courseId: course.id, customer }).expect(200);

      const response = await startCheckout({
        courseId: course.id,
        customer,
      }).expect(200);

      expect(response.body).toEqual({ status: "check_email" });
      expect((await queuedEmails()).map((email) => email.kind).sort()).toEqual([
        "access_granted",
        "already_owned",
      ]);
    });
  });

  describe("the buyer's email", () => {
    it("is matched without regard to case or surrounding spaces", async () => {
      const { course } = await createCourseOnSale(0);

      await startCheckout({ courseId: course.id, customer }).expect(200);
      await startCheckout({
        courseId: course.id,
        customer: { name: customer.name, email: "  Ada@Example.COM " },
      }).expect(200);

      expect(await db.orm.public.Customer.all()).toEqual([
        expect.objectContaining({ email: "ada@example.com" }),
      ]);
    });
  });

  describe("errors", () => {
    it("returns 404 for a course that isn't on sale", async () => {
      const courseId = randomUUID();

      const response = await startCheckout({ courseId, customer }).expect(404);

      expect(response.body).toEqual({
        title: "Course not found",
        detail: `No course exists with ID ${courseId}.`,
        code: "COURSE_NOT_FOUND",
      });
    });

    it("returns 409 for a course that has ended", async () => {
      const now = Temporal.Now.instant();
      const { course } = await createPricedCourse(
        {
          startsAt: now.subtract({ hours: 3 }),
          endsAt: now.subtract({ hours: 1 }),
        },
        { amount: 9900, effectiveAt: now.subtract({ hours: 48 }) },
      );

      const response = await startCheckout({
        courseId: course.id,
        customer,
      }).expect(409);

      expect(response.body).toEqual({
        title: "Course not purchasable",
        detail: "This course has ended and can no longer be bought.",
        code: "COURSE_NOT_PURCHASABLE",
      });
    });

    it("returns every validation error at once", async () => {
      const response = await startCheckout({
        courseId: "not-a-uuid",
        customer: { name: " ", email: "not-an-email" },
        price: 1,
      }).expect(400);

      expect(response.body).toMatchObject({
        code: "VALIDATION_FAILED",
        errors: expect.arrayContaining([
          expect.objectContaining({
            field: "/courseId",
            code: "INVALID_FORMAT",
          }),
          expect.objectContaining({
            field: "/customer/name",
            code: "TOO_SHORT",
          }),
          expect.objectContaining({
            field: "/customer/email",
            code: "INVALID_FORMAT",
          }),
          expect.objectContaining({ field: "/price", code: "UNKNOWN_FIELD" }),
        ]),
      });
    });
  });
});
