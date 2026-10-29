import { Test, type TestingModule } from "@nestjs/testing";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { Temporal } from "@js-temporal/polyfill";

import { CoursesRepository } from "../../../repositories/courses.repository.js";
import {
  createCourse,
  createCoursePrice,
  createCustomer,
  createPayment,
  createEnrollment,
  descriptionDoc,
} from "../../../../test/course-fixtures.js";
import { CourseImagesRepository } from "../../../repositories/course-images.repository.js";
import { CoursesService } from "../../../courses.service.js";
import { instant } from "../../../../test/test-helpers.js";
import { PrismaModule } from "../../../../prisma/prisma.module.js";

const NOW = instant("2026-09-29T14:00:00Z");

describe("CoursesService integration", () => {
  let service: CoursesService;
  let testingModule: TestingModule;

  beforeAll(async () => {
    testingModule = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [CoursesService, CoursesRepository, CourseImagesRepository],
    }).compile();

    service = testingModule.get(CoursesService);
  });

  beforeEach(() => {
    vi.spyOn(Temporal.Now, "instant").mockReturnValue(NOW);
  });

  afterAll(async () => {
    await testingModule.close();
  });

  describe("findAll", () => {
    it("counts enrollments for the course", async () => {
      const course = await createCourse({
        title: "Popular Course",
        summary: "Many students",
        description: descriptionDoc("Many students"),
        startsAt: instant("2026-10-01T18:00:00Z"),
        endsAt: instant("2026-10-01T20:00:00Z"),
        timeZone: "America/New_York",
      });

      const price = await createCoursePrice({
        courseId: course.id,
        amount: 9900,
        currency: "USD",
        effectiveAt: instant("2026-09-01T00:00:00Z"),
      });

      for (let i = 0; i < 3; i++) {
        const customer = await createCustomer({});

        const payment = await createPayment({
          customerId: customer.id,
          coursePriceId: price.id,
          amount: price.amount,
          currency: price.currency,
        });

        await createEnrollment({
          courseId: course.id,
          customerId: customer.id,
          paymentId: payment.id,
        });
      }

      const result = await service.findAll();

      expect(result.courses[0].enrollmentCount).toBe(3);
    });

    it("counts only enrollments that still give access", async () => {
      const course = await createCourse({
        title: "Refunded Course",
        summary: "Some students left",
        description: descriptionDoc("Some students left"),
        startsAt: instant("2026-10-01T18:00:00Z"),
        endsAt: instant("2026-10-01T20:00:00Z"),
        timeZone: "America/New_York",
      });

      await createCoursePrice({
        courseId: course.id,
        amount: 0,
        currency: "USD",
        effectiveAt: instant("2026-09-01T00:00:00Z"),
      });

      const now = instant("2026-10-01T00:00:00Z");
      const states = [{}, { revokedAt: now }, { suspendedAt: now }];

      for (const state of states) {
        const customer = await createCustomer({});

        await createEnrollment({
          courseId: course.id,
          customerId: customer.id,
          ...state,
        });
      }

      const result = await service.findAll();

      expect(result.courses[0].enrollmentCount).toBe(1);
    });

    it("does not count enrollments belonging to another course", async () => {
      const courseA = await createCourse({
        title: "Course A",
        summary: "A",
        description: descriptionDoc("A"),
        startsAt: instant("2026-10-01T18:00:00Z"),
        endsAt: instant("2026-10-01T20:00:00Z"),
        timeZone: "America/New_York",
      });

      const courseB = await createCourse({
        title: "Course B",
        summary: "B",
        description: descriptionDoc("B"),
        startsAt: instant("2026-10-02T18:00:00Z"),
        endsAt: instant("2026-10-02T20:00:00Z"),
        timeZone: "America/New_York",
      });

      await createCoursePrice({
        courseId: courseA.id,
        amount: 9900,
        currency: "USD",
        effectiveAt: instant("2026-09-01T00:00:00Z"),
      });

      const priceB = await createCoursePrice({
        courseId: courseB.id,
        amount: 9900,
        currency: "USD",
        effectiveAt: instant("2026-09-01T00:00:00Z"),
      });

      const customer = await createCustomer({});

      const payment = await createPayment({
        customerId: customer.id,
        coursePriceId: priceB.id,
        amount: priceB.amount,
        currency: priceB.currency,
      });

      await createEnrollment({
        courseId: courseB.id,
        customerId: customer.id,
        paymentId: payment.id,
      });

      const result = await service.findAll();

      const returnedA = result.courses.find(
        (course) => course.name === "Course A",
      );

      expect(returnedA?.enrollmentCount).toBe(0);
    });

    it("returns the schedule with the course timezone", async () => {
      const course = await createCourse({
        title: "Timezone Course",
        summary: "Timezone test",
        description: descriptionDoc("Timezone test"),
        startsAt: instant("2027-01-15T18:00:00Z"),
        endsAt: instant("2027-01-15T20:00:00Z"),
        timeZone: "America/New_York",
      });

      await createCoursePrice({
        courseId: course.id,
        amount: 9900,
        currency: "USD",
        effectiveAt: instant("2026-09-01T00:00:00Z"),
      });

      const result = await service.findAll();

      expect(result.courses[0].schedule).toEqual({
        startTime: "2027-01-15T18:00:00Z",
        endTime: "2027-01-15T20:00:00Z",
        timeZone: "America/New_York",
      });
    });
  });
});
