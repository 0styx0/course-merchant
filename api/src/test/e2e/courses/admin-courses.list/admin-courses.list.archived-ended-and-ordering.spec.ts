import {
  createCourse,
  createCoursePrice,
  createPricedCourse,
  updateCourseStatus,
  descriptionDoc,
} from "@/test/course-fixtures.js";
import type { INestApplication } from "@nestjs/common";
import { Temporal } from "@js-temporal/polyfill";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { bearer, logInAsAdmin } from "../../../admin-fixtures.js";
import {
  createE2eApp,
  httpServer,
  type TypedResponse,
} from "../../e2e-helpers.js";
import type { ListCoursesAdminResponse } from "types.js";

describe("Admin Courses API (e2e)", () => {
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

  describe("GET /v1/admin/courses", () => {
    it("includes archived courses and reports their latest status", async () => {
      const { course } = await createPricedCourse();

      await updateCourseStatus(
        course.id,
        "archived",
        Temporal.Instant.from("2026-09-29T14:00:00Z"),
      );

      const response: TypedResponse<ListCoursesAdminResponse> = await request(
        httpServer(app),
      )
        .get("/v1/admin/courses")
        .set("Authorization", bearer(token))
        .expect(200);

      expect(response.body.courses).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: course.id,
            status: expect.objectContaining({
              name: "archived",
            }),
          }),
        ]),
      );
    });

    it("includes ended courses and courses with only future prices", async () => {
      const { course: endedCourse } = await createPricedCourse({
        title: "Ended Course",
        startsAt: Temporal.Instant.from("2026-09-20T13:00:00Z"),
        endsAt: Temporal.Instant.from("2026-09-20T15:00:00Z"),
      });

      const futureCourse = await createCourse({
        title: "Future Price Course",
        summary: "my future course",
        description: descriptionDoc("my future course"),
        startsAt: Temporal.Instant.from("2026-11-01T18:00:00Z"),
        endsAt: Temporal.Instant.from("2026-11-01T20:00:00Z"),
        timeZone: "America/New_York",
      });

      await createCoursePrice({
        courseId: futureCourse.id,
        amount: 12900,
        currency: "USD",
        effectiveAt: Temporal.Instant.from("2026-10-20T00:00:00Z"),
      });

      const response: TypedResponse<ListCoursesAdminResponse> = await request(
        httpServer(app),
      )
        .get("/v1/admin/courses")
        .set("Authorization", bearer(token))
        .expect(200);

      expect(response.body.courses).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: endedCourse.id }),
          expect.objectContaining({ id: futureCourse.id }),
        ]),
      );

      const futureCourseResult = response.body.courses.find(
        (item: { id: string }) => item.id === futureCourse.id,
      );

      expect(futureCourseResult?.prices).toEqual([
        expect.objectContaining({
          amount: 12900,
          currency: "USD",
          effectiveAt: "2026-10-20T00:00:00Z",
        }),
      ]);
    });

    it("returns courses ordered by start time descending", async () => {
      const { course: earlier } = await createPricedCourse({
        title: "Earlier Course",
        startsAt: Temporal.Instant.from("2026-10-01T18:00:00Z"),
        endsAt: Temporal.Instant.from("2026-10-01T20:00:00Z"),
      });

      const { course: later } = await createPricedCourse({
        title: "Later Course",
        startsAt: Temporal.Instant.from("2026-12-01T18:00:00Z"),
        endsAt: Temporal.Instant.from("2026-12-01T20:00:00Z"),
      });

      const response: TypedResponse<ListCoursesAdminResponse> = await request(
        httpServer(app),
      )
        .get("/v1/admin/courses")
        .set("Authorization", bearer(token))
        .expect(200);

      const ids = response.body.courses.map(
        (course: { id: string }) => course.id,
      );

      expect(ids.indexOf(later.id)).toBeLessThan(ids.indexOf(earlier.id));
    });

    it("returns an empty list when no courses exist", async () => {
      // This test requires an isolated or cleaned test database.
      const response: TypedResponse<ListCoursesAdminResponse> = await request(
        httpServer(app),
      )
        .get("/v1/admin/courses")
        .set("Authorization", bearer(token))
        .expect("Content-Type", /^application\/json(?:;|$)/)
        .expect(200);

      expect(response.body).toEqual({
        courses: [],
      });
    });
  });
});
