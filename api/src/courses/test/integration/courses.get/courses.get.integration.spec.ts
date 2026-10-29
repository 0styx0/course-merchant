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

import { instant } from "../../../../test/test-helpers.js";
import { CourseImagesRepository } from "../../../repositories/course-images.repository.js";
import { CoursesRepository } from "../../../repositories/courses.repository.js";
import { CoursesService } from "../../../courses.service.js";
import { PrismaModule } from "../../../../prisma/prisma.module.js";
import {
  createCoursePrice,
  createPricedCourse,
  descriptionDoc,
} from "../../../../test/course-fixtures.js";

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

  describe("findById", () => {
    it("returns an upcoming course", async () => {
      const { course } = await createPricedCourse();

      const result = await service.findById(course.id);

      expect(result).toEqual({
        id: course.id,
        name: "React Fundamentals",
        summary: "Learn React",
        description: descriptionDoc("Learn React"),
        enrollmentCount: 0,
        // the fixture's image is made at NOW
        image: { version: String(NOW.epochMilliseconds) },
        price: {
          amount: 9900,
          currency: "USD",
        },
        schedule: {
          startTime: "2026-10-01T18:00:00Z",
          endTime: "2026-10-01T20:00:00Z",
          timeZone: "America/New_York",
        },
      });
    });

    it("returns an in-progress course", async () => {
      const { course } = await createPricedCourse({
        title: "In Progress",
        summary: "Currently running",
        description: descriptionDoc("Currently running"),
        startsAt: instant("2026-09-29T13:00:00Z"),
        endsAt: instant("2026-09-29T15:00:00Z"),
      });

      const result = await service.findById(course.id);

      expect(result).toEqual({
        id: course.id,
        name: "In Progress",
        summary: "Currently running",
        description: descriptionDoc("Currently running"),
        enrollmentCount: 0,
        image: { version: String(NOW.epochMilliseconds) },
        price: {
          amount: 9900,
          currency: "USD",
        },
        schedule: {
          startTime: "2026-09-29T13:00:00Z",
          endTime: "2026-09-29T15:00:00Z",
          timeZone: "America/New_York",
        },
      });
    });

    it("returns an ended course", async () => {
      const { course } = await createPricedCourse({
        title: "Ended",
        summary: "Already finished",
        description: descriptionDoc("Already finished"),
        startsAt: instant("2026-09-28T13:00:00Z"),
        endsAt: instant("2026-09-28T15:00:00Z"),
      });

      const result = await service.findById(course.id);

      expect(result).toEqual({
        id: course.id,
        name: "Ended",
        summary: "Already finished",
        description: descriptionDoc("Already finished"),
        enrollmentCount: 0,
        image: { version: String(NOW.epochMilliseconds) },
        price: {
          amount: 9900,
          currency: "USD",
        },
        schedule: {
          startTime: "2026-09-28T13:00:00Z",
          endTime: "2026-09-28T15:00:00Z",
          timeZone: "America/New_York",
        },
      });
    });

    it("returns a course whose end time is exactly now", async () => {
      const { course } = await createPricedCourse({
        title: "Ending Now",
        summary: "Ends now",
        description: descriptionDoc("Ends now"),
        startsAt: instant("2026-09-29T13:00:00Z"),
        endsAt: NOW,
      });

      const result = await service.findById(course.id);

      expect(result.id).toBe(course.id);
    });

    it("returns the most recent currently effective price", async () => {
      const { course } = await createPricedCourse(
        {},
        {
          effectiveAt: instant("2026-07-01T00:00:00Z"),
        },
      );

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

      const result = await service.findById(course.id);

      expect(result.price).toEqual({
        amount: 7900,
        currency: "USD",
      });
    });
  });
});
