import { Test, type TestingModule } from "@nestjs/testing";
import { Temporal } from "@js-temporal/polyfill";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { instant } from "../../../test/test-helpers.js";
import {
  createCoursePrice,
  createCustomer,
  createPayment,
  createEnrollment,
  createEnrollmentEmail,
  archiveCourse,
  createPricedCourse,
} from "../../../test/course-fixtures.js";
import { PrismaModule } from "../../../prisma/prisma.module.js";
import { AdminCoursesService } from "@/courses/admin-courses.service.js";
import { AdminCoursesRepository } from "@/courses/courses.repository/admin-courses.repository.js";

const NOW = instant("2026-09-29T14:00:00Z");

const NONEXISTENT_COURSE_ID = "123e4567-e89b-12d3-a456-426614174000";

describe("AdminCoursesService integration", () => {
  let service: AdminCoursesService;
  let testingModule: TestingModule;

  beforeAll(async () => {
    testingModule = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [AdminCoursesService, AdminCoursesRepository],
    }).compile();

    service = testingModule.get(AdminCoursesService);
  });

  beforeEach(() => {
    vi.spyOn(Temporal.Now, "instant").mockReturnValue(NOW);
  });

  afterAll(async () => {
    await testingModule.close();
  });

  describe("findByIdAdmin", () => {
    it("returns the complete admin representation of a course", async () => {
      const { course, price } = await createPricedCourse(
        {
          title: "React Fundamentals",
          description: "Learn React",
          startsAt: instant("2026-10-01T18:00:00Z"),
          endsAt: instant("2026-10-01T20:00:00Z"),
          timeZone: "America/New_York",
        },
        {
          effectiveAt: instant("2026-07-01T00:00:00Z"),
        },
      );

      const result = await service.findByIdAdmin(course.id);

      expect(result).toEqual({
        id: course.id,
        name: "React Fundamentals",
        description: "Learn React",
        contentUrl: "https://example.com/course",
        schedule: {
          startTime: "2026-10-01T18:00:00Z",
          endTime: "2026-10-01T20:00:00Z",
          timeZone: "America/New_York",
        },
        status: {
          name: "published",
          changedAt: expect.any(String),
        },
        prices: [
          {
            id: price.id,
            amount: price.amount,
            currency: price.currency,
            effectiveAt: "2026-07-01T00:00:00Z",
          },
        ],
        enrollments: [],
      });

      expect(Temporal.Instant.from(result.status.changedAt)).toBeInstanceOf(
        Temporal.Instant,
      );
    });

    it("returns the most recent status, not an older status", async () => {
      const { course } = await createPricedCourse();

      // The course starts with a published status.
      // Append a newer archived status.
      const archivedAt = course.createdAt.add({ seconds: 1 });

      await archiveCourse(course.id, archivedAt);

      const result = await service.findByIdAdmin(course.id);

      // Admin GET returns archived courses, but reports only
      // the most recent status.
      expect(result.id).toBe(course.id);
      expect(result.status.name).toBe("archived");

      expect(
        Temporal.Instant.from(result.status.changedAt).equals(archivedAt),
      ).toBe(true);
    });

    it("returns a course that has already ended", async () => {
      const { course } = await createPricedCourse(
        {
          title: "Ended Course",
          description: "This course has finished",
          startsAt: instant("2026-09-27T18:00:00Z"),
          endsAt: instant("2026-09-27T20:00:00Z"),
          timeZone: "America/New_York",
        },
        {
          effectiveAt: instant("2026-07-01T00:00:00Z"),
        },
      );

      const result = await service.findByIdAdmin(course.id);

      expect(result.id).toBe(course.id);
      expect(result.name).toBe("Ended Course");
      expect(result.schedule).toEqual({
        startTime: "2026-09-27T18:00:00Z",
        endTime: "2026-09-27T20:00:00Z",
        timeZone: "America/New_York",
      });
    });

    it("returns a course whose prices all take effect in the future", async () => {
      const { course, price } = await createPricedCourse(
        {
          title: "Future Price Course",
          description: "Not publicly available yet",
        },
        {
          effectiveAt: instant("2026-10-01T00:00:00Z"),
        },
      );

      const result = await service.findByIdAdmin(course.id);

      expect(result.id).toBe(course.id);
      expect(result.prices).toEqual([
        {
          id: price.id,
          amount: price.amount,
          currency: price.currency,
          effectiveAt: "2026-10-01T00:00:00Z",
        },
      ]);
    });

    it("returns the full price schedule ordered by effectiveAt ascending", async () => {
      const { course, price: julyPrice } = await createPricedCourse(
        {},
        {
          effectiveAt: instant("2026-07-01T00:00:00Z"),
        },
      );

      // Insert these out of chronological order to verify that
      // the repository orders the returned schedule.
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

      const result = await service.findByIdAdmin(course.id);

      expect(result.prices).toEqual([
        {
          id: julyPrice.id,
          amount: julyPrice.amount,
          currency: julyPrice.currency,
          effectiveAt: "2026-07-01T00:00:00Z",
        },
        {
          id: augustPrice.id,
          amount: augustPrice.amount,
          currency: augustPrice.currency,
          effectiveAt: "2026-08-01T00:00:00Z",
        },
        {
          id: octoberPrice.id,
          amount: octoberPrice.amount,
          currency: octoberPrice.currency,
          effectiveAt: "2026-10-01T00:00:00Z",
        },
      ]);
    });

    it("returns all enrollments with their correct customer and payment details", async () => {
      const { course, price: julyPrice } = await createPricedCourse(
        {
          title: "Popular Course",
          timeZone: "America/New_York",
        },
        {
          effectiveAt: instant("2026-07-01T00:00:00Z"),
        },
      );

      const augustPrice = await createCoursePrice({
        courseId: course.id,
        amount: 12900,
        currency: "USD",
        effectiveAt: instant("2026-08-01T00:00:00Z"),
      });

      const ada = await createCustomer({
        name: "Ada Lovelace",
      });

      const adaPaidAt = instant("2026-10-18T15:00:00Z");

      const adaPayment = await createPayment({
        customerId: ada.id,
        coursePriceId: julyPrice.id,
        amount: julyPrice.amount,
        currency: julyPrice.currency,
        paidAt: adaPaidAt,
      });

      const adaEnrollment = await createEnrollment({
        courseId: course.id,
        customerId: ada.id,
        paymentId: adaPayment.id,
      });

      const grace = await createCustomer({
        name: "Grace Hopper",
      });

      const gracePaidAt = instant("2026-10-18T16:30:00Z");

      const gracePayment = await createPayment({
        customerId: grace.id,
        coursePriceId: augustPrice.id,
        amount: augustPrice.amount,
        currency: augustPrice.currency,
        paidAt: gracePaidAt,
      });

      await createEnrollment({
        courseId: course.id,
        customerId: grace.id,
        paymentId: gracePayment.id,
      });

      await createEnrollmentEmail({
        enrollment: adaEnrollment,
        recipient: ada.email,
        status: "sent",
      });

      const result = await service.findByIdAdmin(course.id);

      expect(result.enrollments).toHaveLength(2);

      // Enrollment ordering is not specified by the repository,
      // so assert each customer/payment association independently.
      expect(result.enrollments).toEqual(
        expect.arrayContaining([
          {
            revokedAt: null,
            suspendedAt: null,
            emailStatus: "sent",
            customer: {
              id: ada.id,
              name: "Ada Lovelace",
              email: ada.email,
            },
            payment: {
              status: "succeeded",
              amount: julyPrice.amount,
              paidAt: "2026-10-18T15:00:00Z",
            },
          },
          {
            revokedAt: null,
            suspendedAt: null,
            // no email was ever queued for Grace
            emailStatus: "failed",
            customer: {
              id: grace.id,
              name: "Grace Hopper",
              email: grace.email,
            },
            payment: {
              status: "succeeded",
              amount: augustPrice.amount,
              paidAt: "2026-10-18T16:30:00Z",
            },
          },
        ]),
      );
    });

    it("reports the status of the enrollment's newest email", async () => {
      const { course } = await createPricedCourse();
      const ada = await createCustomer({ name: "Ada Lovelace" });
      const enrollment = await createEnrollment({
        courseId: course.id,
        customerId: ada.id,
      });

      await createEnrollmentEmail({
        enrollment,
        recipient: ada.email,
        status: "failed",
        createdAt: instant("2026-09-29T10:00:00Z"),
      });
      await createEnrollmentEmail({
        enrollment,
        recipient: ada.email,
        status: "sent",
        createdAt: instant("2026-09-29T11:00:00Z"),
      });

      const result = await service.findByIdAdmin(course.id);

      expect(result.enrollments[0].emailStatus).toBe("sent");
    });

    it("returns 404 COURSE_NOT_FOUND when the course does not exist", async () => {
      await expect(
        service.findByIdAdmin(NONEXISTENT_COURSE_ID),
      ).rejects.toMatchObject({
        status: 404,
        response: {
          title: "Course not found",
          code: "COURSE_NOT_FOUND",
        },
      });
    });
  });
});
