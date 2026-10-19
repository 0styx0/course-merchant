import { AppModule } from "@/app.module.js";
import { configureApp } from "@/configure-app.js";
import {
  createCoursePrice,
  createPricedCourse,
  updateCourseStatus,
} from "@/test/course-fixtures.js";
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

import { instant } from "../../test-helpers.js";

describe("Admin Courses API (e2e)", () => {
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

  describe("GET /v1/admin/courses/:courseId", () => {
    it("returns the complete admin representation of a course", async () => {
      const { course, price } = await createPricedCourse(
        {
          title: "React Fundamentals",
          description: "Learn the fundamentals of React.",
          startsAt: instant("2026-10-15T18:00:00Z"),
          endsAt: instant("2026-10-15T20:00:00Z"),
          timeZone: "America/New_York",
        },
        {
          amount: 9900,
          currency: "USD",
          effectiveAt: instant("2026-01-01T00:00:00Z"),
        },
      );

      const response = await request(app.getHttpServer())
        .get(`/v1/admin/courses/${course.id}`)
        .expect("Content-Type", /^application\/json(?:;|$)/)
        .expect(200);

      expect(response.body).toEqual({
        id: course.id,
        name: "React Fundamentals",
        description: "Learn the fundamentals of React.",
        schedule: {
          startTime: "2026-10-15T14:00:00-04:00",
          endTime: "2026-10-15T16:00:00-04:00",
          timeZone: "America/New_York",
        },
        status: {
          name: "published",
          changedAt: expect.any(String),
        },
        prices: [
          {
            id: price.id,
            amount: 9900,
            currency: "USD",
            effectiveAt: "2025-12-31T19:00:00-05:00",
          },
        ],
        enrollments: [],
      });

      expect(
        Temporal.Instant.from(response.body.status.changedAt),
      ).toBeInstanceOf(Temporal.Instant);
    });

    it("uses the most recent archived status, even when an older status is published", async () => {
      const { course } = await createPricedCourse(
        {},
        {
          effectiveAt: instant("2026-01-01T00:00:00Z"),
        },
      );

      const archivedAt = course.createdAt.add({ seconds: 2 });

      await updateCourseStatus(
        course.id,
        "archived",
        archivedAt,
      );

      const response = await request(app.getHttpServer())
        .get(`/v1/admin/courses/${course.id}`)
        .expect(200);

      expect(response.body.status.name).toBe("archived");

      expect(
        Temporal.Instant.from(response.body.status.changedAt).equals(
          archivedAt,
        ),
      ).toBe(true);
    });

    it("uses the most recent published status, even when an older status is archived", async () => {
      const { course } = await createPricedCourse(
        {},
        {
          effectiveAt: instant("2026-01-01T00:00:00Z"),
        },
      );

      const archivedAt = course.createdAt.add({ seconds: 2 });
      const publishedAt = course.createdAt.add({ seconds: 3 });

      await updateCourseStatus(
        course.id,
        "archived",
        archivedAt,
      );

      await updateCourseStatus(
        course.id,
        "published",
        publishedAt,
      );

      const response = await request(app.getHttpServer())
        .get(`/v1/admin/courses/${course.id}`)
        .expect(200);

      expect(response.body.status.name).toBe("published");

      expect(
        Temporal.Instant.from(response.body.status.changedAt).equals(
          publishedAt,
        ),
      ).toBe(true);
    });

    it("returns an ended course", async () => {
      const { course } = await createPricedCourse(
        {
          title: "Ended Course",
          description: "This course has finished.",
          startsAt: instant("2025-09-27T18:00:00Z"),
          endsAt: instant("2025-09-27T20:00:00Z"),
          timeZone: "America/New_York",
        },
        {
          effectiveAt: instant("2025-01-01T00:00:00Z"),
        },
      );

      const response = await request(app.getHttpServer())
        .get(`/v1/admin/courses/${course.id}`)
        .expect(200);

      expect(response.body.id).toBe(course.id);
      expect(response.body.name).toBe("Ended Course");
      expect(response.body.schedule).toEqual({
        startTime: "2025-09-27T14:00:00-04:00",
        endTime: "2025-09-27T16:00:00-04:00",
        timeZone: "America/New_York",
      });
    });

    it("returns future prices when none is currently effective", async () => {
      const { course, price } = await createPricedCourse(
        {
          title: "Future Price Course",
          description: "This price is not active yet.",
        },
        {
          amount: 12900,
          currency: "USD",
          effectiveAt: instant("2027-01-01T00:00:00Z"),
        },
      );

      const response = await request(app.getHttpServer())
        .get(`/v1/admin/courses/${course.id}`)
        .expect(200);

      expect(response.body.prices).toEqual([
        {
          id: price.id,
          amount: 12900,
          currency: "USD",
          effectiveAt: "2026-12-31T19:00:00-05:00",
        },
      ]);
    });

    it("returns the full price schedule ordered by effectiveAt ascending", async () => {
      const { course, price: julyPrice } = await createPricedCourse(
        {},
        {
          amount: 4900,
          currency: "USD",
          effectiveAt: instant("2026-07-01T00:00:00Z"),
        },
      );

      // Insert the October price before the August price to verify
      // the repository orders the schedule by effectiveAt.
      const octoberPrice = await createCoursePrice({
        courseId: course.id,
        amount: 12900,
        currency: "USD",
        effectiveAt: instant("2026-10-01T00:00:00Z"),
      });

      const augustPrice = await createCoursePrice({
        courseId: course.id,
        amount: 7900,
        currency: "USD",
        effectiveAt: instant("2026-08-01T00:00:00Z"),
      });

      const response = await request(app.getHttpServer())
        .get(`/v1/admin/courses/${course.id}`)
        .expect(200);

      expect(response.body.prices).toEqual([
        {
          id: julyPrice.id,
          amount: 4900,
          currency: "USD",
          effectiveAt: "2026-06-30T20:00:00-04:00",
        },
        {
          id: augustPrice.id,
          amount: 7900,
          currency: "USD",
          effectiveAt: "2026-07-31T20:00:00-04:00",
        },
        {
          id: octoberPrice.id,
          amount: 12900,
          currency: "USD",
          effectiveAt: "2026-09-30T20:00:00-04:00",
        },
      ]);
    });

    it("returns 400 for a malformed course ID", async () => {
      const response = await request(app.getHttpServer())
        .get("/v1/admin/courses/not-a-uuid")
        .expect(
          "Content-Type",
          /^application\/problem\+json(?:;|$)/,
        )
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
        .get(`/v1/admin/courses/${courseId}`)
        .expect(
          "Content-Type",
          /^application\/problem\+json(?:;|$)/,
        )
        .expect(404);

      expect(response.body).toEqual({
        title: "Course not found",
        detail: "",
        code: "COURSE_NOT_FOUND",
      });
    });
  });
});