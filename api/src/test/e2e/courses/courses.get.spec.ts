import { AppModule } from "@/app.module.js";
import { configureApp } from "@/configure-app.js";
import { createPricedCourse } from "@/test/course-fixtures.js";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { randomUUID } from "node:crypto";
import { Temporal } from "@js-temporal/polyfill";
import request from "supertest";
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from "vitest";

describe("Courses API (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("GET /v1/courses/:courseId", () => {
    it("returns a course with an effective price", async () => {
      const { course } = await createPricedCourse(
        {
          title: "React Fundamentals",
          description: "Learn the fundamentals of React.",
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

      const response = await request(app.getHttpServer())
        .get(`/v1/courses/${course.id}`)
        .expect("Content-Type", /^application\/json(?:;|$)/)
        .expect(200);

      expect(response.body).toEqual({
        id: course.id,
        name: "React Fundamentals",
        description: "Learn the fundamentals of React.",
        enrollmentCount: 0,
        price: {
          amount: 9900,
          currency: "USD",
        },
        schedule: {
          startTime: "2026-10-15T14:00:00-04:00",
          endTime: "2026-10-15T16:00:00-04:00",
          timeZone: "America/New_York",
        },
      });
    });

    it("returns 400 for a malformed course ID", async () => {
      const response = await request(app.getHttpServer())
        .get("/v1/courses/not-a-uuid")
        .expect("Content-Type", /^application\/problem\+json(?:;|$)/)
        .expect(400);

      expect(response.body).toEqual({
        title: "Invalid course ID",
        detail: "",
        code: "INVALID_COURSE_ID",
      });
    });

    it("returns 404 for a nonexistent course", async () => {
      const courseId = randomUUID();

      const response = await request(app.getHttpServer())
        .get(`/v1/courses/${courseId}`)
        .expect("Content-Type", /^application\/problem\+json(?:;|$)/)
        .expect(404);

      expect(response.body).toEqual({
        title: "Course not found",
        detail: ``,
        code: "COURSE_NOT_FOUND",
      });
    });
  });
});