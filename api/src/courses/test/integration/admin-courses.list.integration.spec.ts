import { Temporal } from "@js-temporal/polyfill";
import { Test, type TestingModule } from "@nestjs/testing";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { PrismaModule } from "@/prisma/prisma.module.js";
import {
  createCoursePrice,
  createCustomer,
  createEnrollment,
  createPayment,
  createPricedCourse,
  updateCourseStatus,
} from "@/test/course-fixtures.js";
import { instant } from "@/test/test-helpers.js";
import { AdminCoursesService } from "@/courses/admin-courses.service.js";
import { AdminCoursesRepository } from "@/courses/courses.repository/admin-courses.repository.js";

const NOW = instant("2026-09-29T14:00:00Z");

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

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await testingModule.close();
  });

  describe("findAllAdmin", () => {
    it("includes a course whose latest status is published", async () => {
      const { course } = await createPricedCourse();

      const result = await service.findAllAdmin();

      const listedCourse = result.courses.find(
        (item) => item.id === course.id,
      );

      expect(listedCourse).toBeDefined();
      expect(listedCourse!.status.name).toBe("published");
    });

    it("includes an archived course when archived is its latest status", async () => {
      const { course } = await createPricedCourse();

      const archivedAt = course.createdAt.add({ seconds: 1 });

      await updateCourseStatus(
        course.id,
        "archived",
        archivedAt,
      );

      const result = await service.findAllAdmin();

      const listedCourse = result.courses.find(
        (item) => item.id === course.id,
      );

      expect(listedCourse).toBeDefined();
      expect(listedCourse!.status.name).toBe("archived");
      expect(
        Temporal.Instant.from(listedCourse!.status.changedAt).equals(
          archivedAt,
        ),
      ).toBe(true);
    });

    it("excludes a course whose latest status is deleted, even if its older status was published", async () => {
      const { course } = await createPricedCourse();

      await updateCourseStatus(
        course.id,
        "deleted",
        course.createdAt.add({ seconds: 1 }),
      );

      const result = await service.findAllAdmin();

      expect(
        result.courses.some((item) => item.id === course.id),
      ).toBe(false);
    });

    it("includes a course whose latest status is published, even if an older status was deleted", async () => {
      const { course } = await createPricedCourse();

      await updateCourseStatus(
        course.id,
        "deleted",
        course.createdAt.add({ seconds: 1 }),
      );

      const publishedAt = course.createdAt.add({ seconds: 2 });

      await updateCourseStatus(
        course.id,
        "published",
        publishedAt,
      );

      const result = await service.findAllAdmin();

      const listedCourse = result.courses.find(
        (item) => item.id === course.id,
      );

      expect(listedCourse).toBeDefined();
      expect(listedCourse!.status.name).toBe("published");
      expect(
        Temporal.Instant.from(listedCourse!.status.changedAt).equals(
          publishedAt,
        ),
      ).toBe(true);
    });

    it("returns the full price schedule in effectiveAt ascending order", async () => {
      const { course, price: julyPrice } = await createPricedCourse(
        {},
        {
          amount: 4900,
          currency: "USD",
          effectiveAt: instant("2026-07-01T00:00:00Z"),
        },
      );

      // Insert October before August to verify ordering by effectiveAt.
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

      const result = await service.findAllAdmin();

      const listedCourse = result.courses.find(
        (item) => item.id === course.id,
      );

      expect(listedCourse).toBeDefined();
      expect(listedCourse!.prices).toEqual([
        {
          id: julyPrice.id,
          amount: 4900,
          currency: "USD",
          effectiveAt: "2026-07-01T00:00:00Z",
        },
        {
          id: augustPrice.id,
          amount: 7900,
          currency: "USD",
          effectiveAt: "2026-08-01T00:00:00Z",
        },
        {
          id: octoberPrice.id,
          amount: 12900,
          currency: "USD",
          effectiveAt: "2026-10-01T00:00:00Z",
        },
      ]);
    });

    it("includes a course whose prices all take effect in the future", async () => {
      const { course, price } = await createPricedCourse(
        {
          title: "Future Price Course",
          description: "Not publicly available yet",
        },
        {
          amount: 12900,
          currency: "USD",
          effectiveAt: instant("2027-01-01T00:00:00Z"),
        },
      );

      const result = await service.findAllAdmin();

      const listedCourse = result.courses.find(
        (item) => item.id === course.id,
      );

      expect(listedCourse).toBeDefined();
      expect(listedCourse!.prices).toEqual([
        {
          id: price.id,
          amount: 12900,
          currency: "USD",
          effectiveAt: "2027-01-01T00:00:00Z",
        },
      ]);
    });

    it("includes courses that have already ended", async () => {
      const { course } = await createPricedCourse(
        {
          title: "Ended Course",
          description: "This course has finished",
          startsAt: instant("2025-09-27T18:00:00Z"),
          endsAt: instant("2025-09-27T20:00:00Z"),
          timeZone: "America/New_York",
        },
        {
          effectiveAt: instant("2025-01-01T00:00:00Z"),
        },
      );

      const result = await service.findAllAdmin();

      const listedCourse = result.courses.find(
        (item) => item.id === course.id,
      );

      expect(listedCourse).toBeDefined();
      expect(listedCourse!.schedule).toEqual({
        startTime: "2025-09-27T18:00:00Z",
        endTime: "2025-09-27T20:00:00Z",
        timeZone: "America/New_York",
      });
    });

    it("orders courses by start time descending", async () => {
      const { course: olderCourse } = await createPricedCourse(
        {
          title: "Older Course",
          startsAt: instant("2026-10-01T18:00:00Z"),
          endsAt: instant("2026-10-01T20:00:00Z"),
        },
        {
          effectiveAt: instant("2026-01-01T00:00:00Z"),
        },
      );

      const { course: newerCourse } = await createPricedCourse(
        {
          title: "Newer Course",
          startsAt: instant("2026-12-01T18:00:00Z"),
          endsAt: instant("2026-12-01T20:00:00Z"),
        },
        {
          effectiveAt: instant("2026-01-01T00:00:00Z"),
        },
      );

      const { course: middleCourse } = await createPricedCourse(
        {
          title: "Middle Course",
          startsAt: instant("2026-11-01T18:00:00Z"),
          endsAt: instant("2026-11-01T20:00:00Z"),
        },
        {
          effectiveAt: instant("2026-01-01T00:00:00Z"),
        },
      );

      const result = await service.findAllAdmin();
      const courseIds = result.courses.map((course) => course.id);

      const olderIndex = courseIds.indexOf(olderCourse.id);
      const middleIndex = courseIds.indexOf(middleCourse.id);
      const newerIndex = courseIds.indexOf(newerCourse.id);

      expect(olderIndex).toBeGreaterThanOrEqual(0);
      expect(middleIndex).toBeGreaterThanOrEqual(0);
      expect(newerIndex).toBeGreaterThanOrEqual(0);

      expect(newerIndex).toBeLessThan(middleIndex);
      expect(middleIndex).toBeLessThan(olderIndex);
    });

    it("returns all enrollments with their corresponding customer and payment details", async () => {
      const { course, price: julyPrice } = await createPricedCourse(
        {},
        {
          amount: 7900,
          currency: "USD",
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

      const adaPaidAt = instant("2026-09-29T13:00:00Z");

      const adaPayment = await createPayment({
        customerId: ada.id,
        coursePriceId: julyPrice.id,
        amount: julyPrice.amount,
        currency: julyPrice.currency,
        paidAt: adaPaidAt,
      });

      await createEnrollment({
        courseId: course.id,
        customerId: ada.id,
        paymentId: adaPayment.id,
      });

      const grace = await createCustomer({
        name: "Grace Hopper",
      });

      const gracePaidAt = instant("2026-09-29T12:00:00Z");

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

      const result = await service.findAllAdmin();

      const listedCourse = result.courses.find(
        (item) => item.id === course.id,
      );

      expect(listedCourse).toBeDefined();
      expect(listedCourse!.enrollments).toHaveLength(2);

      expect(listedCourse!.enrollments).toEqual(
        expect.arrayContaining([
          {
            customer: {
              id: ada.id,
              name: "Ada Lovelace",
              email: ada.email,
            },
            payment: {
              status: "succeeded",
              amount: julyPrice.amount,
              paidAt: "2026-09-29T13:00:00Z",
            },
          },
          {
            customer: {
              id: grace.id,
              name: "Grace Hopper",
              email: grace.email,
            },
            payment: {
              status: "succeeded",
              amount: augustPrice.amount,
              paidAt: "2026-09-29T12:00:00Z",
            },
          },
        ]),
      );
    });

    it("returns an empty enrollment list for a course without enrollments", async () => {
      const { course } = await createPricedCourse();

      const result = await service.findAllAdmin();

      const listedCourse = result.courses.find(
        (item) => item.id === course.id,
      );

      expect(listedCourse).toBeDefined();
      expect(listedCourse!.enrollments).toEqual([]);
    });
  });
});