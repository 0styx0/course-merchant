import { INestApplication } from "@nestjs/common";
import { Temporal } from "@js-temporal/polyfill";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { bearer, logInAsAdmin } from "../../../admin-fixtures.js";
import {
  createE2eApp,
  httpServer,
  type TypedResponse,
} from "../../e2e-helpers.js";
import type {
  GetCourseAdminResponse,
  ProblemDetails,
  ValidationProblemDetails,
} from "types.js";
import { descriptionDoc } from "@/test/course-fixtures.js";

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

  async function getAdminCourse(
    courseId: string,
  ): Promise<TypedResponse<GetCourseAdminResponse>> {
    return request(httpServer(app))
      .get(`/v1/admin/courses/${courseId}`)
      .set("Authorization", bearer(token))
      .expect(200);
  }

  it("stores a formatted description and returns it as written", async () => {
    const description = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Intro" }],
        },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: "Bold",
                      marks: [{ type: "bold" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const response: TypedResponse<GetCourseAdminResponse> = await request(
      httpServer(app),
    )
      .post("/v1/admin/courses")
      .set("Authorization", bearer(token))
      .send({ ...makeCreateRequest(), description })
      .expect(201);

    expect(response.body.description).toEqual(description);

    const getResponse = await getAdminCourse(response.body.id);

    expect(getResponse.body.description).toEqual(description);
  });

  it("points at the link whose scheme is refused", async () => {
    const description = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Click",
              marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }],
            },
          ],
        },
      ],
    };

    const response: TypedResponse<ValidationProblemDetails> = await request(
      httpServer(app),
    )
      .post("/v1/admin/courses")
      .set("Authorization", bearer(token))
      .send({ ...makeCreateRequest(), description })
      .expect(400);

    expect(response.body.errors).toEqual([
      expect.objectContaining({
        field: "/description/content/0/content/0/marks/0/attrs/href",
        code: "INVALID_VALUE",
      }),
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
