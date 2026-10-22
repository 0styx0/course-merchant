import {
  createCourse,
  createCoursePrice,
  createCustomer,
  createEnrollment,
  createPayment,
  createPricedCourse,
  updateCourseStatus,
} from "@/test/course-fixtures.js";
import type { INestApplication } from "@nestjs/common";
import { Temporal } from "@js-temporal/polyfill";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createE2eApp,
  httpServer,
  type TypedResponse,
} from "../e2e-helpers.js";
import type { ListCoursesAdminResponse } from "types.js";

describe("Admin Courses API (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createE2eApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("GET /v1/admin/courses", () => {
    it("returns courses with the admin response shape", async () => {
      const { course, price } = await createPricedCourse(
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

      const customer = await createCustomer({
        name: "Ada Lovelace",
      });

      const paidAt = Temporal.Instant.from("2026-09-29T15:00:00Z");

      const payment = await createPayment({
        customerId: customer.id,
        coursePriceId: price.id,
        amount: price.amount,
        currency: price.currency,
        paidAt,
      });

      await createEnrollment({
        courseId: course.id,
        customerId: customer.id,
        paymentId: payment.id,
      });

      // Ensure the course has a known, latest status.
      const changedAt = Temporal.Instant.from("2026-09-29T14:00:00Z");
      await updateCourseStatus(course.id, "published", changedAt);

      const response: TypedResponse<ListCoursesAdminResponse> = await request(
        httpServer(app),
      )
        .get("/v1/admin/courses")
        .expect("Content-Type", /^application\/json(?:;|$)/)
        .expect(200);

      expect(response.body.courses).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: course.id,
            name: "React Fundamentals",
            description: "Learn the fundamentals of React.",
            contentUrl: "https://example.com/course",
            schedule: {
              startTime: "2026-10-15T18:00:00Z",
              endTime: "2026-10-15T20:00:00Z",
              timeZone: "America/New_York",
            },
            status: {
              name: "published",
              changedAt: "2026-09-29T14:00:00Z",
            },
            prices: [
              {
                id: price.id,
                amount: 9900,
                currency: "USD",
                effectiveAt: "2026-01-01T00:00:00Z",
              },
            ],
            enrollments: [
              {
                revokedAt: null,
                suspendedAt: null,
                customer: {
                  id: customer.id,
                  name: "Ada Lovelace",
                  email: customer.email,
                },
                payment: {
                  status: "succeeded",
                  amount: 9900,
                  paidAt: "2026-09-29T15:00:00Z",
                },
              },
            ],
          }),
        ]),
      );

      expect(
        Temporal.Instant.from(
          response.body.courses.find(
            (item: { id: string }) => item.id === course.id,
          )!.enrollments[0].payment!.paidAt!,
        ),
      ).toEqual(paidAt);
    });

    it("includes a course when its latest status is published, even if an older status was deleted", async () => {
      const { course } = await createPricedCourse();

      await updateCourseStatus(
        course.id,
        "deleted",
        Temporal.Instant.from("2026-09-28T14:00:00Z"),
      );
      await updateCourseStatus(
        course.id,
        "published",
        Temporal.Instant.from("2026-09-29T14:00:00Z"),
      );

      const response: TypedResponse<ListCoursesAdminResponse> = await request(
        httpServer(app),
      )
        .get("/v1/admin/courses")
        .expect(200);

      expect(response.body.courses).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: course.id,
            status: expect.objectContaining({
              name: "published",
            }),
          }),
        ]),
      );
    });

    it("excludes a course when its latest status is deleted, even if an older status was published", async () => {
      const { course } = await createPricedCourse();

      await updateCourseStatus(
        course.id,
        "published",
        Temporal.Instant.from("2026-09-28T14:00:00Z"),
      );
      await updateCourseStatus(
        course.id,
        "deleted",
        Temporal.Instant.from("2026-09-29T14:00:00Z"),
      );

      const response: TypedResponse<ListCoursesAdminResponse> = await request(
        httpServer(app),
      )
        .get("/v1/admin/courses")
        .expect(200);

      expect(response.body.courses).not.toEqual(
        expect.arrayContaining([expect.objectContaining({ id: course.id })]),
      );
    });

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
        description: "my future course",
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
        .expect("Content-Type", /^application\/json(?:;|$)/)
        .expect(200);

      expect(response.body).toEqual({
        courses: [],
      });
    });
  });
});
