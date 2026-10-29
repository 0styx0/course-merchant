import {
  createPricedCourse,
  updateCourseStatus,
  descriptionDoc,
} from "@/test/course-fixtures.js";
import type { INestApplication } from "@nestjs/common";
import { Temporal } from "@js-temporal/polyfill";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { instant } from "../../../test-helpers.js";
import { bearer, logInAsAdmin } from "../../../admin-fixtures.js";
import {
  createE2eApp,
  httpServer,
  type TypedResponse,
} from "../../e2e-helpers.js";
import type { GetCourseAdminResponse } from "types.js";

describe("Admin Courses Create API (e2e)", () => {
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

  describe("GET /v1/admin/courses/:courseId", () => {
    it("returns the complete admin representation of a course", async () => {
      const { course, price } = await createPricedCourse(
        {
          title: "React Fundamentals",
          summary: "Learn the fundamentals of React.",
          description: descriptionDoc("Learn the fundamentals of React."),
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

      const response: TypedResponse<GetCourseAdminResponse> = await request(
        httpServer(app),
      )
        .get(`/v1/admin/courses/${course.id}`)
        .set("Authorization", bearer(token))
        .expect("Content-Type", /^application\/json(?:;|$)/)
        .expect(200);

      expect(response.body).toEqual({
        id: course.id,
        name: "React Fundamentals",
        summary: "Learn the fundamentals of React.",
        description: descriptionDoc("Learn the fundamentals of React."),
        contentUrl: "https://example.com/course",
        schedule: {
          startTime: "2026-10-15T18:00:00Z",
          endTime: "2026-10-15T20:00:00Z",
          timeZone: "America/New_York",
        },
        status: {
          name: "published",
          changedAt: expect.any(String),
        },
        image: { updatedAt: expect.any(String), version: expect.any(String) },
        prices: [
          {
            id: price.id,
            amount: 9900,
            currency: "USD",
            effectiveAt: "2026-01-01T00:00:00Z",
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

      await updateCourseStatus(course.id, "archived", archivedAt);

      const response: TypedResponse<GetCourseAdminResponse> = await request(
        httpServer(app),
      )
        .get(`/v1/admin/courses/${course.id}`)
        .set("Authorization", bearer(token))
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

      await updateCourseStatus(course.id, "archived", archivedAt);

      await updateCourseStatus(course.id, "published", publishedAt);

      const response: TypedResponse<GetCourseAdminResponse> = await request(
        httpServer(app),
      )
        .get(`/v1/admin/courses/${course.id}`)
        .set("Authorization", bearer(token))
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
          summary: "This course has finished.",
          description: descriptionDoc("This course has finished."),
          startsAt: instant("2025-09-27T18:00:00Z"),
          endsAt: instant("2025-09-27T20:00:00Z"),
          timeZone: "America/New_York",
        },
        {
          effectiveAt: instant("2025-01-01T00:00:00Z"),
        },
      );

      const response: TypedResponse<GetCourseAdminResponse> = await request(
        httpServer(app),
      )
        .get(`/v1/admin/courses/${course.id}`)
        .set("Authorization", bearer(token))
        .expect(200);

      expect(response.body.id).toBe(course.id);
      expect(response.body.name).toBe("Ended Course");
      expect(response.body.schedule).toEqual({
        startTime: "2025-09-27T18:00:00Z",
        endTime: "2025-09-27T20:00:00Z",
        timeZone: "America/New_York",
      });
    });
  });
});
