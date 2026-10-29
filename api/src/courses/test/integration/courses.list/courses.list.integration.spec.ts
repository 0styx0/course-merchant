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
        description: descriptionDoc("Learn React"),
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
          description: descriptionDoc("Learn React"),
          enrollmentCount: 0,
          image: { version: expect.stringMatching(/^[0-9]+$/) },
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
        description: descriptionDoc("Currently running"),
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
        description: descriptionDoc("Ends now"),
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
        description: descriptionDoc("Later course"),
        startsAt: instant("2026-10-03T18:00:00Z"),
        endsAt: instant("2026-10-03T20:00:00Z"),
        timeZone: "America/New_York",
      });

      const earlier = await createCourse({
        title: "Earlier",
        summary: "Earlier course",
        description: descriptionDoc("Earlier course"),
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
        description: descriptionDoc("A"),
        startsAt: instant("2026-10-01T18:00:00Z"),
        endsAt: instant("2026-10-01T20:00:00Z"),
        timeZone: "America/New_York",
      });

      const courseB = await createCourse({
        title: "Course B",
        summary: "B",
        description: descriptionDoc("B"),
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
        description: descriptionDoc("Finished"),
        startsAt: instant("2026-09-01T18:00:00Z"),
        endsAt: instant("2026-09-01T20:00:00Z"),
        timeZone: "America/New_York",
      });

      const later = await createCourse({
        title: "Later",
        summary: "Later",
        description: descriptionDoc("Later"),
        startsAt: instant("2026-10-03T18:00:00Z"),
        endsAt: instant("2026-10-03T20:00:00Z"),
        timeZone: "America/New_York",
      });

      const earlier = await createCourse({
        title: "Earlier",
        summary: "Earlier",
        description: descriptionDoc("Earlier"),
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
  });
});
