import { INestApplication } from "@nestjs/common";
import { Temporal } from "@js-temporal/polyfill";
import request from "supertest";
import Stripe from "stripe";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/prisma/db.js";
import { createPricedCourse } from "@/test/course-fixtures.js";
import {
  createE2eApp,
  httpServer,
  type TypedResponse,
} from "../e2e-helpers.js";
import { useStripeMock } from "../stripe-mock.js";
import type { ProblemDetails } from "types.js";

describe("POST /v1/webhooks/stripe (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createE2eApp(useStripeMock);
  });

  afterAll(async () => {
    await app.close();
  });

  // starts a paid checkout and returns the Payment it created
  async function startPaidCheckout() {
    const now = Temporal.Now.instant();
    const { course } = await createPricedCourse(
      { startsAt: now.add({ hours: 24 }), endsAt: now.add({ hours: 26 }) },
      { amount: 9900, effectiveAt: now.subtract({ hours: 1 }) },
    );

    await request(httpServer(app))
      .post("/v1/checkout-sessions")
      .send({
        courseId: course.id,
        customer: { name: "Ada Lovelace", email: "ada@example.com" },
      })
      .expect(200);

    const [payment] = await db.orm.public.Payment.all();

    return payment;
  }

  function sessionEvent(
    type: string,
    payment: { id: string; providerCheckoutId: string | null },
    id = "evt_test_1",
  ): string {
    return JSON.stringify({
      id,
      object: "event",
      type,
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: payment.providerCheckoutId,
          object: "checkout.session",
          client_reference_id: payment.id,
          payment_status: type.endsWith("expired") ? "unpaid" : "paid",
          payment_intent: "pi_test_1",
        },
      },
    });
  }

  function post(payload: string, signature?: string) {
    const req = request(httpServer(app))
      .post("/v1/webhooks/stripe")
      .set("Content-Type", "application/json");

    if (signature) {
      req.set("Stripe-Signature", signature);
    }

    return req.send(payload);
  }

  function sign(payload: string): string {
    return Stripe.webhooks.generateTestHeaderString({
      payload,
      secret: process.env["STRIPE_WEBHOOK_SECRET"]!,
    });
  }

  it("rejects a request without a signature", async () => {
    const response: TypedResponse<ProblemDetails> = await post("{}")
      .expect("Content-Type", /^application\/problem\+json(?:;|$)/)
      .expect(400);

    expect(response.body).toMatchObject({
      title: "Invalid webhook signature",
      code: "INVALID_WEBHOOK_SIGNATURE",
    });
  });

  it("rejects a signature made for a different body", async () => {
    const payment = await startPaidCheckout();
    const payload = sessionEvent("checkout.session.completed", payment);

    await post(payload, sign("{}")).expect(400);

    expect(await db.orm.public.Enrollment.all()).toEqual([]);
  });

  it("enrolls the buyer and queues the access email for a completed checkout", async () => {
    const payment = await startPaidCheckout();
    const payload = sessionEvent("checkout.session.completed", payment);

    await post(payload, sign(payload)).expect(200);

    expect(await db.orm.public.Payment.all()).toEqual([
      expect.objectContaining({
        status: "succeeded",
        providerPaymentId: "pi_test_1",
      }),
    ]);
    expect(await db.orm.public.Enrollment.all()).toHaveLength(1);
    expect(await db.orm.public.EmailOutbox.all()).toHaveLength(1);
  });

  it("changes nothing when the same event is delivered again", async () => {
    const payment = await startPaidCheckout();
    const payload = sessionEvent("checkout.session.completed", payment);

    await post(payload, sign(payload)).expect(200);
    await post(payload, sign(payload)).expect(200);

    expect(await db.orm.public.Enrollment.all()).toHaveLength(1);
    expect(await db.orm.public.EmailOutbox.all()).toHaveLength(1);
  });

  it("expires the payment of an expired checkout", async () => {
    const payment = await startPaidCheckout();
    const payload = sessionEvent("checkout.session.expired", payment);

    await post(payload, sign(payload)).expect(200);

    expect(await db.orm.public.Payment.all()).toEqual([
      expect.objectContaining({ status: "expired" }),
    ]);
    expect(await db.orm.public.Enrollment.all()).toEqual([]);
  });

  it("acknowledges an event type it doesn't handle", async () => {
    const payment = await startPaidCheckout();
    const payload = sessionEvent("charge.refunded", payment);

    await post(payload, sign(payload)).expect(200);

    expect(await db.orm.public.Payment.all()).toEqual([
      expect.objectContaining({ status: "pending" }),
    ]);
  });
});
