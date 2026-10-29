import { INestApplication } from "@nestjs/common";
import { Temporal } from "@js-temporal/polyfill";
import { randomUUID } from "node:crypto";
import request from "supertest";
import sharp from "sharp";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  createCourse,
  createCoursePrice,
  descriptionDoc,
} from "@/test/course-fixtures.js";
import { bearer, logInAsAdmin } from "../../../admin-fixtures.js";
import {
  createE2eApp,
  httpServer,
  type TypedResponse,
} from "../../e2e-helpers.js";
import type {
  CourseDescription,
  GetCourseAdminResponse,
  ValidationProblemDetails,
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

  async function uploadImage(courseId: string) {
    const image = await sharp({
      create: { width: 1200, height: 900, channels: 3, background: "#3366cc" },
    })
      .jpeg()
      .toBuffer();

    await request(httpServer(app))
      .put(`/v1/admin/courses/${courseId}/image`)
      .set("Authorization", bearer(token))
      .attach("image", image, "a.jpg")
      .expect(204);
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

  it("updates a course and returns the same representation as POST", async () => {
    const draft = await createViaApi();
    await uploadImage(draft.id);
    const created = await getAdminCourse(draft.id);
    const body = {
      ...toUpdateBody(created),
      name: "Updated name",
      status: "published",
    };

    const response: TypedResponse<GetCourseAdminResponse> = await request(
      httpServer(app),
    )
      .put(`/v1/admin/courses/${created.id}`)
      .set("Authorization", bearer(token))
      .send(body)
      .expect(200);

    expect(response.body).toEqual({
      ...created,
      name: "Updated name",
      status: {
        name: "published",
        changedAt: expect.any(String),
      },
    });
    expect(await getAdminCourse(created.id)).toEqual(response.body);
  });

  it("refuses to publish a course that has no image", async () => {
    const created = await createViaApi();

    const response: TypedResponse<ValidationProblemDetails> = await request(
      httpServer(app),
    )
      .put(`/v1/admin/courses/${created.id}`)
      .set("Authorization", bearer(token))
      .send({ ...toUpdateBody(created), status: "published" })
      .expect(400);

    expect(response.body.errors).toEqual([
      expect.objectContaining({ field: "/status", code: "INVALID_VALUE" }),
    ]);
    expect((await getAdminCourse(created.id)).status.name).toBe("drafted");
  });

  it("changes nothing when the loaded course is sent back", async () => {
    const created = await createViaApi();

    await request(httpServer(app))
      .put(`/v1/admin/courses/${created.id}`)
      .set("Authorization", bearer(token))
      .send(toUpdateBody(created))
      .expect(200);

    expect(await getAdminCourse(created.id)).toEqual(created);
  });

  it("edits a course that has already started", async () => {
    const now = Temporal.Now.instant();
    const course = await createCourse({
      title: "Started course",
      summary: "Learn React",
      description: descriptionDoc("Learn React"),
      startsAt: now.subtract({ hours: 1 }),
      endsAt: now.add({ hours: 1 }),
      timeZone: "UTC",
    });

    await createCoursePrice({
      courseId: course.id,
      amount: 5000,
      currency: "USD",
      effectiveAt: now.subtract({ hours: 48 }),
    });

    const loaded = await getAdminCourse(course.id);

    const response: TypedResponse<GetCourseAdminResponse> = await request(
      httpServer(app),
    )
      .put(`/v1/admin/courses/${course.id}`)
      .set("Authorization", bearer(token))
      .send({
        ...toUpdateBody(loaded),
        description: descriptionDoc("Now with hooks"),
      })
      .expect(200);

    expect(response.body.description).toEqual(descriptionDoc("Now with hooks"));
  });
});
