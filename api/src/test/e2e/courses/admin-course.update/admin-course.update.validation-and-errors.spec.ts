import { INestApplication } from "@nestjs/common";
import { Temporal } from "@js-temporal/polyfill";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { descriptionDoc } from "@/test/course-fixtures.js";
import { bearer, logInAsAdmin } from "../../../admin-fixtures.js";
import {
  createE2eApp,
  httpServer,
  type TypedResponse,
} from "../../e2e-helpers.js";
import type {
  CourseDescription,
  GetCourseAdminResponse,
  ProblemDetails,
} from "types.js";

describe("PUT /admin/courses/:courseId (e2e)", () => {
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
      description: descriptionDoc("Course created by an E2E test."),
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

  async function createViaApi() {
    const response: TypedResponse<GetCourseAdminResponse> = await request(
      httpServer(app),
    )
      .post("/v1/admin/courses")
      .set("Authorization", bearer(token))
      .send(makeCreateRequest())
      .expect(201);

    return response.body;
  }

  async function getAdminCourse(courseId: string) {
    const response: TypedResponse<GetCourseAdminResponse> = await request(
      httpServer(app),
    )
      .get(`/v1/admin/courses/${courseId}`)
      .set("Authorization", bearer(token))
      .expect(200);

    return response.body;
  }

  // what a form sends back after loading getCourseAsAdmin
  function toUpdateBody(course: {
    name: string;
    summary: string;
    description: CourseDescription;
    contentUrl: string;
    status: { name: string };
    schedule: unknown;
    prices: { amount: number; currency: string; effectiveAt: string }[];
  }) {
    return {
      name: course.name,
      summary: course.summary,
      description: course.description,
      contentUrl: course.contentUrl,
      status: course.status.name,
      schedule: course.schedule,
      prices: course.prices.map(({ amount, currency, effectiveAt }) => ({
        amount,
        currency,
        effectiveAt,
      })),
    };
  }

  it("returns all format errors with JSON pointers", async () => {
    const created = await createViaApi();

    const response: TypedResponse<ProblemDetails> = await request(
      httpServer(app),
    )
      .put(`/v1/admin/courses/${created.id}`)
      .set("Authorization", bearer(token))
      .send({
        ...toUpdateBody(created),
        name: " ",
        prices: [{ ...created.prices[0], amount: 10 }],
      })
      .expect("Content-Type", /^application\/problem\+json(?:;|$)/)
      .expect(400);

    expect(response.body).toMatchObject({
      code: "VALIDATION_FAILED",
      errors: expect.arrayContaining([
        expect.objectContaining({ field: "/name" }),
        expect.objectContaining({ field: "/prices/0/amount" }),
        expect.objectContaining({
          field: "/prices/0/id",
          code: "UNKNOWN_FIELD",
        }),
      ]),
    });
  });

  it("returns all errors that depend on the stored course", async () => {
    const created = await createViaApi();
    const past = Temporal.Now.instant().subtract({ hours: 1 }).toString();

    const response: TypedResponse<ProblemDetails> = await request(
      httpServer(app),
    )
      .put(`/v1/admin/courses/${created.id}`)
      .set("Authorization", bearer(token))
      .send({
        ...toUpdateBody(created),
        schedule: { ...created.schedule, startTime: past },
        prices: [{ amount: 2500, currency: "USD", effectiveAt: past }],
      })
      .expect(400);

    expect(response.body).toMatchObject({
      code: "VALIDATION_FAILED",
      errors: [
        expect.objectContaining({
          field: "/schedule/startTime",
          code: "IN_PAST",
        }),
        expect.objectContaining({
          field: "/prices/0/effectiveAt",
          code: "IN_PAST",
        }),
      ],
    });
    expect(await getAdminCourse(created.id)).toEqual(created);
  });

  it("returns 400 for a malformed course ID", async () => {
    const response: TypedResponse<ProblemDetails> = await request(
      httpServer(app),
    )
      .put("/v1/admin/courses/not-a-uuid")
      .set("Authorization", bearer(token))
      .send(makeCreateRequest())
      .expect(400);

    expect(response.body).toMatchObject({ code: "INVALID_COURSE_ID" });
  });

  it("returns 404 for a nonexistent course", async () => {
    const response: TypedResponse<ProblemDetails> = await request(
      httpServer(app),
    )
      .put(`/v1/admin/courses/${randomUUID()}`)
      .set("Authorization", bearer(token))
      .send(makeCreateRequest())
      .expect(404);

    expect(response.body).toMatchObject({ code: "COURSE_NOT_FOUND" });
  });
});
