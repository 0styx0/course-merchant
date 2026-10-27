import { INestApplication } from "@nestjs/common";
import { Temporal } from "@js-temporal/polyfill";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { instant, toDatabasePrecision } from "@/test/test-helpers.js";
import { bearer, logInAsAdmin } from "../../admin-fixtures.js";
import {
  createE2eApp,
  httpServer,
  type TypedResponse,
} from "../e2e-helpers.js";
import type {
  GetCourseAdminResponse,
  ProblemDetails,
  ValidationProblemDetails,
} from "types.js";

describe("POST /admin/courses (e2e)", () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    app = await createE2eApp();
  });

  beforeEach(async () => {
    token = await logInAsAdmin(app);
  });

  afterAll(async () => {
    await app.close();
  });

  function makeCreateRequest() {
    const now = Temporal.Now.instant();
    const startsAt = now.add({ hours: 3 });

    return {
      name: `E2E course ${randomUUID()}`,
      summary: "Course created by an E2E test.",
      description: "Course created by an E2E test.",
      contentUrl: "https://drive.google.com/drive/folders/e2e",
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

  async function getAdminCourse(
    courseId: string,
  ): Promise<TypedResponse<GetCourseAdminResponse>> {
    return request(httpServer(app))
      .get(`/v1/admin/courses/${courseId}`)
      .set("Authorization", bearer(token))
      .expect(200);
  }

  it("creates a course with its initial status and price", async () => {
    const body = makeCreateRequest();

    const response: TypedResponse<GetCourseAdminResponse> = await request(
      httpServer(app),
    )
      .post("/v1/admin/courses")
      .set("Authorization", bearer(token))
      .send(body)
      .expect(201);

    expect(response.body).toMatchObject({
      id: expect.any(String),
      name: body.name,
      summary: body.summary,
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
          effectiveAt: instant(body.prices[0].effectiveAt),
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
    const startsAt = Temporal.Instant.from(body.schedule.startTime);

    const earlierEffectiveAt = startsAt.subtract({ hours: 2 }).toString();

    const laterEffectiveAt = startsAt.subtract({ hours: 1 }).toString();

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

    const response: TypedResponse<GetCourseAdminResponse> = await request(
      httpServer(app),
    )
      .post("/v1/admin/courses")
      .set("Authorization", bearer(token))
      .send(body)
      .expect(201);

    const getResponse = await getAdminCourse(response.body.id);

    expect(getResponse.body).toEqual(response.body);

    expect(
      getResponse.body.prices.map(
        (price: { amount: number; currency: string; effectiveAt: string }) => ({
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
      new Set(getResponse.body.prices.map((price: { id: string }) => price.id))
        .size,
    ).toBe(2);
  });

  it("returns the new course's URL in the Location header", async () => {
    const response: TypedResponse<GetCourseAdminResponse> = await request(
      httpServer(app),
    )
      .post("/v1/admin/courses")
      .set("Authorization", bearer(token))
      .send(makeCreateRequest())
      .expect(201);

    expect(response.headers.location).toBe(
      `/v1/admin/courses/${response.body.id}`,
    );
  });

  it("returns the private content link to admins", async () => {
    const body = makeCreateRequest();

    const response: TypedResponse<GetCourseAdminResponse> = await request(
      httpServer(app),
    )
      .post("/v1/admin/courses")
      .set("Authorization", bearer(token))
      .send(body)
      .expect(201);

    expect(response.body.contentUrl).toBe(body.contentUrl);
    expect((await getAdminCourse(response.body.id)).body.contentUrl).toBe(
      body.contentUrl,
    );
  });

  it("rejects a currency the store doesn't accept", async () => {
    const body = makeCreateRequest();

    const response: TypedResponse<ValidationProblemDetails> = await request(
      httpServer(app),
    )
      .post("/v1/admin/courses")
      .set("Authorization", bearer(token))
      .send({ ...body, prices: [{ ...body.prices[0], currency: "EUR" }] })
      .expect(400);

    expect(response.body.errors).toEqual([
      {
        field: "/prices/0/currency",
        code: "INVALID_VALUE",
        detail: "Must be one of the accepted currencies: USD.",
      },
    ]);
  });

  it.each(["published", "deleted"])("rejects the %s status", async (status) => {
    const response: TypedResponse<ValidationProblemDetails> = await request(
      httpServer(app),
    )
      .post("/v1/admin/courses")
      .set("Authorization", bearer(token))
      .send({ ...makeCreateRequest(), status })
      .expect(400);

    expect(response.body.errors).toEqual([
      expect.objectContaining({ field: "/status", code: "INVALID_VALUE" }),
    ]);
  });

  it("returns all validation errors for an invalid request", async () => {
    const body = {
      ...makeCreateRequest(),
      name: " ",
      prices: [],
    };

    const response: TypedResponse<ProblemDetails> = await request(
      httpServer(app),
    )
      .post("/v1/admin/courses")
      .set("Authorization", bearer(token))
      .send(body)
      .expect(400);

    expect(response.body).toEqual({
      title: "Validation failed",
      detail: "The request contains 2 invalid fields.",
      code: "VALIDATION_FAILED",
      errors: [
        {
          field: "/name",
          code: "TOO_SHORT",
          detail: expect.any(String),
        },
        {
          field: "/prices",
          code: "TOO_SHORT",
          detail: expect.any(String),
        },
      ],
    });
  });
});
