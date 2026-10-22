import { INestApplication } from "@nestjs/common";
import { Temporal } from "@js-temporal/polyfill";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/prisma/db.js";
import { createPricedCourse } from "@/test/course-fixtures.js";
import { createE2eApp } from "../e2e-helpers.js";
import { useStripeMock } from "../stripe-mock.js";

describe("GET /v1/checkout-sessions/:checkoutId (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createE2eApp(useStripeMock);
  });

  afterAll(async () => {
    await app.close();
  });

  // starts a paid checkout and returns the Stripe session id the buyer
  // would come back with
  async function startPaidCheckout(): Promise<string> {
    const now = Temporal.Now.instant();
    const { course } = await createPricedCourse(
      { startsAt: now.add({ hours: 24 }), endsAt: now.add({ hours: 26 }) },
      { amount: 9900, effectiveAt: now.subtract({ hours: 1 }) },
    );

    await request(app.getHttpServer())
      .post("/v1/checkout-sessions")
      .send({
        courseId: course.id,
        customer: { name: "Ada Lovelace", email: "ada@example.com" },
      })
      .expect(200);

    const [payment] = await db.orm.public.Payment.all();

    return payment.providerCheckoutId!;
  }

  function getStatus(checkoutId: string) {
    return request(app.getHttpServer()).get(
      `/v1/checkout-sessions/${checkoutId}`,
    );
  }

  it("reports pending until Stripe confirms the payment", async () => {
    const checkoutId = await startPaidCheckout();

    const response = await getStatus(checkoutId).expect(200);

    expect(response.body).toEqual({ status: "pending" });
  });

  it("reports the payment's current status", async () => {
    const checkoutId = await startPaidCheckout();

    // what the step 3 webhook will do once Stripe confirms the payment
    await db.orm.public.Payment.where((payment) =>
      payment.providerCheckoutId.eq(checkoutId),
    ).update({ status: "succeeded", paidAt: Temporal.Now.instant() });

    const response = await getStatus(checkoutId).expect(200);

    expect(response.body).toEqual({ status: "succeeded" });
  });

  it("returns 404 for an unknown checkout", async () => {
    const response = await getStatus("cs_test_unknown")
      .expect("Content-Type", /^application\/problem\+json(?:;|$)/)
      .expect(404);

    expect(response.body).toEqual({
      title: "Checkout not found",
      detail: "No checkout exists with ID cs_test_unknown.",
      code: "CHECKOUT_NOT_FOUND",
    });
  });
});
