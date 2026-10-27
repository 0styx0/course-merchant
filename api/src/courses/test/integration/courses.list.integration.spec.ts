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

import { CoursesRepository } from "../../courses.repository/courses.repository.js";
import {
  createCourse,
  createCoursePrice,
  createCustomer,
  createPayment,
  createEnrollment,
} from "../../../test/course-fixtures.js";
import { CoursesService } from "../../courses.service.js";
import { instant } from "../../../test/test-helpers.js";
import { PrismaModule } from "../../../prisma/prisma.module.js";

const NOW = instant("2026-09-29T14:00:00Z");

describe("CoursesService integration", () => {
  let service: CoursesService;
  let testingModule: TestingModule;

  beforeAll(async () => {
    testingModule = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [CoursesService, CoursesRepository],
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
    it("returns an empty courses array when the database is empty", async () => {
      const result = await service.findAll();

      expect(result).toEqual({
        courses: [],
      });
    });

    it("returns an upcoming course", async () => {
      const course = await createCourse({
        title: "React Fundamentals",
        summary: "Learn React",
        description: "Learn React",
        startsAt: instant("2026-10-01T18:00:00Z"),
        endsAt: instant("2026-10-01T20:00:00Z"),
        timeZone: "America/New_York",
      });

      await createCoursePrice({
        courseId: course.id,
        amount: 9900,
        currency: "USD",
        effectiveAt: instant("2026-09-01T00:00:00Z"),
      });

      const result = await service.findAll();

      expect(result.courses).toEqual([
        {
          name: "React Fundamentals",
          summary: "Learn React",
          description: "Learn React",
          enrollmentCount: 0,
          id: course.id,
          price: {
            amount: 9900,
            currency: "USD",
          },
          schedule: {
            startTime: "2026-10-01T18:00:00Z",
            endTime: "2026-10-01T20:00:00Z",
            timeZone: "America/New_York",
          },
        },
      ]);
    });

    it("returns a course that has started but has not ended", async () => {
      const course = await createCourse({
        title: "In Progress",
        summary: "Currently running",
        description: "Currently running",
        startsAt: instant("2026-09-29T13:00:00Z"),
        endsAt: instant("2026-09-29T15:00:00Z"),
        timeZone: "America/New_York",
      });

      await createCoursePrice({
        courseId: course.id,
        amount: 9900,
        currency: "USD",
        effectiveAt: instant("2026-09-01T00:00:00Z"),
      });

      const result = await service.findAll();

      expect(result.courses).toHaveLength(1);
      expect(result.courses[0].name).toBe("In Progress");
    });

    it("does not return a course whose end time is exactly now", async () => {
      const course = await createCourse({
        title: "Ending Now",
        summary: "Ends now",
        description: "Ends now",
        startsAt: instant("2026-09-29T13:00:00Z"),
        endsAt: NOW,
        timeZone: "America/New_York",
      });

      await createCoursePrice({
        courseId: course.id,
        amount: 9900,
        currency: "USD",
        effectiveAt: instant("2026-09-01T00:00:00Z"),
      });

      const result = await service.findAll();

      expect(result).toEqual({
        courses: [],
      });
    });

    it("orders courses by start time ascending", async () => {
      const later = await createCourse({
        title: "Later",
        summary: "Later course",
        description: "Later course",
        startsAt: instant("2026-10-03T18:00:00Z"),
        endsAt: instant("2026-10-03T20:00:00Z"),
        timeZone: "America/New_York",
      });

      const earlier = await createCourse({
        title: "Earlier",
        summary: "Earlier course",
        description: "Earlier course",
        startsAt: instant("2026-10-01T18:00:00Z"),
        endsAt: instant("2026-10-01T20:00:00Z"),
        timeZone: "America/New_York",
      });

      await createCoursePrice({
        courseId: later.id,
        amount: 9900,
        currency: "USD",
        effectiveAt: instant("2026-09-01T00:00:00Z"),
      });

      await createCoursePrice({
        courseId: earlier.id,
        amount: 4900,
        currency: "USD",
        effectiveAt: instant("2026-09-01T00:00:00Z"),
      });

      const result = await service.findAll();

      expect(result.courses.map((course) => course.name)).toEqual([
        "Earlier",
        "Later",
      ]);
    });

    it("uses course id as a deterministic tie-breaker when start times are equal", async () => {
      const courseA = await createCourse({
        title: "Course A",
        summary: "A",
        description: "A",
        startsAt: instant("2026-10-01T18:00:00Z"),
        endsAt: instant("2026-10-01T20:00:00Z"),
        timeZone: "America/New_York",
      });

      const courseB = await createCourse({
        title: "Course B",
        summary: "B",
        description: "B",
        startsAt: instant("2026-10-01T18:00:00Z"),
        endsAt: instant("2026-10-01T20:00:00Z"),
        timeZone: "America/New_York",
      });

      await createCoursePrice({
        courseId: courseA.id,
        amount: 9900,
        currency: "USD",
        effectiveAt: instant("2026-09-01T00:00:00Z"),
      });

      await createCoursePrice({
        courseId: courseB.id,
        amount: 9900,
        currency: "USD",
        effectiveAt: instant("2026-09-01T00:00:00Z"),
      });

      const result = await service.findAll();

      const expectedOrder = [courseA, courseB]
        .sort((a, b) => a.id.localeCompare(b.id))
        .map((course) => course.title);

      expect(result.courses.map((course) => course.name)).toEqual(
        expectedOrder,
      );
    });

    it("excludes ended courses while retaining active courses in start-time order", async () => {
      const ended = await createCourse({
        title: "Ended",
        summary: "Finished",
        description: "Finished",
        startsAt: instant("2026-09-01T18:00:00Z"),
        endsAt: instant("2026-09-01T20:00:00Z"),
        timeZone: "America/New_York",
      });

      const later = await createCourse({
        title: "Later",
        summary: "Later",
        description: "Later",
        startsAt: instant("2026-10-03T18:00:00Z"),
        endsAt: instant("2026-10-03T20:00:00Z"),
        timeZone: "America/New_York",
      });

      const earlier = await createCourse({
        title: "Earlier",
        summary: "Earlier",
        description: "Earlier",
        startsAt: instant("2026-10-01T18:00:00Z"),
        endsAt: instant("2026-10-01T20:00:00Z"),
        timeZone: "America/New_York",
      });

      for (const course of [ended, later, earlier]) {
        await createCoursePrice({
          courseId: course.id,
          amount: 9900,
          currency: "USD",
          effectiveAt: instant("2026-08-01T00:00:00Z"),
        });
      }

      const result = await service.findAll();

      expect(result.courses.map((course) => course.name)).toEqual([
        "Earlier",
        "Later",
      ]);
    });

    it("returns the most recent currently effective price", async () => {
      const course = await createCourse({
        title: "Priced Course",
        summary: "Price history",
        description: "Price history",
        startsAt: instant("2026-10-01T18:00:00Z"),
        endsAt: instant("2026-10-01T20:00:00Z"),
        timeZone: "America/New_York",
      });

      await createCoursePrice({
        courseId: course.id,
        amount: 4900,
        currency: "USD",
        effectiveAt: instant("2026-08-01T00:00:00Z"),
      });

      await createCoursePrice({
        courseId: course.id,
        amount: 7900,
        currency: "USD",
        effectiveAt: instant("2026-09-01T00:00:00Z"),
      });

      await createCoursePrice({
        courseId: course.id,
        amount: 9900,
        currency: "USD",
        effectiveAt: instant("2026-10-01T00:00:00Z"),
      });

      const result = await service.findAll();

      expect(result.courses[0].price).toEqual({
        amount: 7900,
        currency: "USD",
      });
    });

    it("uses a price that becomes effective exactly at now", async () => {
      const course = await createCourse({
        title: "Boundary Price Course",
        summary: "Price boundary",
        description: "Price boundary",
        startsAt: instant("2026-10-01T18:00:00Z"),
        endsAt: instant("2026-10-01T20:00:00Z"),
        timeZone: "America/New_York",
      });

      await createCoursePrice({
        courseId: course.id,
        amount: 9900,
        currency: "USD",
        effectiveAt: NOW,
      });

      const result = await service.findAll();

      expect(result.courses[0].price).toEqual({
        amount: 9900,
        currency: "USD",
      });
    });

    it("does not select a future price", async () => {
      const course = await createCourse({
        title: "Future Price Course",
        summary: "Future pricing",
        description: "Future pricing",
        startsAt: instant("2026-10-01T18:00:00Z"),
        endsAt: instant("2026-10-01T20:00:00Z"),
        timeZone: "America/New_York",
      });

      await createCoursePrice({
        courseId: course.id,
        amount: 7900,
        currency: "USD",
        effectiveAt: instant("2026-09-01T00:00:00Z"),
      });

      await createCoursePrice({
        courseId: course.id,
        amount: 9900,
        currency: "USD",
        effectiveAt: instant("2026-10-01T00:00:00Z"),
      });

      const result = await service.findAll();

      expect(result.courses[0].price.amount).toBe(7900);
    });

    it("counts enrollments for the course", async () => {
      const course = await createCourse({
        title: "Popular Course",
        summary: "Many students",
        description: "Many students",
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
        description: "Some students left",
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
        description: "A",
        startsAt: instant("2026-10-01T18:00:00Z"),
        endsAt: instant("2026-10-01T20:00:00Z"),
        timeZone: "America/New_York",
      });

      const courseB = await createCourse({
        title: "Course B",
        summary: "B",
        description: "B",
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
        description: "Timezone test",
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
