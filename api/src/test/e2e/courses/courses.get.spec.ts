import { createPricedCourse, descriptionDoc } from "@/test/course-fixtures.js";
import type { INestApplication } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { Temporal } from "@js-temporal/polyfill";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createE2eApp,
  httpServer,
  type TypedResponse,
} from "../e2e-helpers.js";
import type { GetCourseResponse, ProblemDetails } from "types.js";

describe("Courses API (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createE2eApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("GET /v1/courses/:courseId", () => {
    it("returns a course with an effective price", async () => {
      const { course } = await createPricedCourse(
        {
          title: "React Fundamentals",
          summary: "Learn the fundamentals of React.",
          description: descriptionDoc("Learn the fundamentals of React."),
          startsAt: Temporal.Instant.from("2026-10-15T18:00:00Z"),
          endsAt: Temporal.Instant.from("2026-10-15T20:00:00Z"),
          timeZone: "America/New_York",
        },
        {
          amount: 9900,
          currency: "USD",
          effectiveAt: Temporal.Instant.from("2026-01-01T00:00:00Z"),
        },
      );

      const response: TypedResponse<GetCourseResponse> = await request(
        httpServer(app),
      )
        .get(`/v1/courses/${course.id}`)
        .expect("Content-Type", /^application\/json(?:;|$)/)
        .expect(200);

      expect(response.body).toEqual({
        id: course.id,
        name: "React Fundamentals",
        summary: "Learn the fundamentals of React.",
        description: descriptionDoc("Learn the fundamentals of React."),
        enrollmentCount: 0,
        image: { version: expect.stringMatching(/^[0-9]+$/) },
        price: {
          amount: 9900,
          currency: "USD",
        },
        schedule: {
          startTime: "2026-10-15T18:00:00Z",
          endTime: "2026-10-15T20:00:00Z",
          timeZone: "America/New_York",
        },
      });
    });

    it("returns 400 for a malformed course ID", async () => {
      const response: TypedResponse<ProblemDetails> = await request(
        httpServer(app),
      )
        .get("/v1/courses/not-a-uuid")
        .expect("Content-Type", /^application\/problem\+json(?:;|$)/)
        .expect(400);

      expect(response.body).toEqual({
        title: "Invalid course ID",
        detail: "'not-a-uuid' is not a valid course identifier.",
        code: "INVALID_COURSE_ID",
      });
    });

    it("returns 404 for a nonexistent course", async () => {
      const courseId = randomUUID();

      const response: TypedResponse<ProblemDetails> = await request(
        httpServer(app),
      )
        .get(`/v1/courses/${courseId}`)
        .expect("Content-Type", /^application\/problem\+json(?:;|$)/)
        .expect(404);

      expect(response.body).toEqual({
        title: "Course not found",
        detail: `No course exists with ID ${courseId}.`,
        code: "COURSE_NOT_FOUND",
      });
    });
  });
});
