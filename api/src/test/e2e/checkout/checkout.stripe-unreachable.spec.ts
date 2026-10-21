import { INestApplication } from "@nestjs/common";
import { Temporal } from "@js-temporal/polyfill";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/prisma/db.js";
import { createPricedCourse } from "@/test/course-fixtures.js";
import { createE2eApp } from "../e2e-helpers.js";
import { useUnreachableStripe } from "../stripe-mock.js";

// A separate file because each app shares one database client, which closing
// the app shuts down: one app per file keeps the others' client open.
describe("POST /v1/checkout-sessions when Stripe can't be reached (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createE2eApp(useUnreachableStripe);
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns 503 and leaves the payment without a session", async () => {
    const now = Temporal.Now.instant();
    const { course } = await createPricedCourse(
      { startsAt: now.add({ hours: 24 }), endsAt: now.add({ hours: 26 }) },
      { amount: 9900, effectiveAt: now.subtract({ hours: 1 }) },
    );

    const response = await request(app.getHttpServer())
      .post("/v1/checkout-sessions")
      .send({
        courseId: course.id,
        customer: { name: "Ada Lovelace", email: "ada@example.com" },
      })
      .expect("Content-Type", /^application\/problem\+json(?:;|$)/)
      .expect(503);

    expect(response.body).toEqual({
      title: "Payment provider unavailable",
      detail: "Payments can't be taken right now. Try again later.",
      code: "PAYMENT_PROVIDER_UNAVAILABLE",
    });
    expect(await db.orm.public.Payment.all()).toEqual([
      expect.objectContaining({ status: "pending", providerCheckoutId: null }),
    ]);
  });
});
