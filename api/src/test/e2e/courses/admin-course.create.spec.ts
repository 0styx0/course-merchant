import { INestApplication } from "@nestjs/common";
import { Temporal } from "@js-temporal/polyfill";
import { randomUUID } from "node:crypto";
import request from "supertest";
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from "vitest";

import { instant, toDatabasePrecision } from "@/test/test-helpers.js";
import { createE2eApp } from "../e2e-helpers.js";

describe("POST /admin/courses (e2e)", () => {

  let app: INestApplication;

  beforeAll(async () => {
    app = await createE2eApp();
  });

  afterAll(async () => {
    await app.close();
  });

  function makeCreateRequest() {
    const now = Temporal.Now.instant();
    const startsAt = now.add({ hours: 3 });

    return {
      name: `E2E course ${randomUUID()}`,
      description: "Course created by an E2E test.",
      status: "drafted",
      schedule: {
        startTime: startsAt.toString(),
        endTime: startsAt.add({ hours: 1 }).toString(),
        timeZone: "UTC",
      },
      prices: [
        {
          amount: 2500,
          currency: "USD",
          effectiveAt: now.add({ hours: 1 }).toString(),
        },
      ],
    };
  }

  async function getAdminCourse(courseId: string) {
    return request(app.getHttpServer())
      .get(`/v1/admin/courses/${courseId}`)
      .expect(200);
  }

  it("creates a course with its initial status and price", async () => {
    const body = makeCreateRequest();

    const response = await request(app.getHttpServer())
      .post("/v1/admin/courses")
      .set("Idempotency-Key", randomUUID())
      .send(body)
      .expect(201);

    expect(response.body).toMatchObject({
      id: expect.any(String),
      name: body.name,
      description: body.description,
      status: {
        name: body.status,
        changedAt: expect.any(String),
      },
      prices: [
        {
          id: expect.any(String),
          amount: 2500,
          currency: "USD",
          effectiveAt: instant(
            body.prices[0].effectiveAt,
          ),
        },
      ],
      schedule: {
        startTime: instant(body.schedule.startTime),
        endTime: instant(body.schedule.endTime),
        timeZone: body.schedule.timeZone,
      },
      enrollments: [],
    });

    const getResponse = await getAdminCourse(response.body.id);

    expect(getResponse.body).toEqual(response.body);
  });

  it("persists multiple prices and returns them in effective-time order", async () => {
    const body = makeCreateRequest();
    const startsAt = Temporal.Instant.from(
      body.schedule.startTime,
    );

    const earlierEffectiveAt = startsAt
      .subtract({ hours: 2 })
      .toString();

    const laterEffectiveAt = startsAt
      .subtract({ hours: 1 })
      .toString();

    body.prices = [
      {
        amount: 5000,
        currency: "USD",
        effectiveAt: laterEffectiveAt,
      },
      {
        amount: 2500,
        currency: "USD",
        effectiveAt: earlierEffectiveAt,
      },
    ];

    const response = await request(app.getHttpServer())
      .post("/v1/admin/courses")
      .set("Idempotency-Key", randomUUID())
      .send(body)
      .expect(201);

    const getResponse = await getAdminCourse(response.body.id);

    expect(getResponse.body).toEqual(response.body);

    expect(
      getResponse.body.prices.map(
        (price: {
          amount: number;
          currency: string;
          effectiveAt: string;
        }) => ({
          amount: price.amount,
          currency: price.currency,
          effectiveAt: price.effectiveAt,
        }),
      ),
    ).toEqual([
      {
        amount: 2500,
        currency: "USD",
        effectiveAt: toDatabasePrecision(earlierEffectiveAt),
      },
      {
        amount: 5000,
        currency: "USD",
        effectiveAt: toDatabasePrecision(laterEffectiveAt),
      },
    ]);

    expect(
      new Set(
        getResponse.body.prices.map(
          (price: { id: string }) => price.id,
        ),
      ).size,
    ).toBe(2);
  });

  it("returns all validation errors for an invalid request", async () => {
    const body = {
      ...makeCreateRequest(),
      name: " ",
      prices: [],
    };

    const response = await request(app.getHttpServer())
      .post("/v1/admin/courses")
      .set("Idempotency-Key", randomUUID())
      .send(body)
      .expect(400);

    expect(response.body).toMatchObject({
      code: "VALIDATION_FAILED",
      errors: expect.arrayContaining([
        expect.objectContaining({
          field: "/name",
        }),
        expect.objectContaining({
          field: "/prices",
        }),
      ]),
    });
  });
});