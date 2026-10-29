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
    it("returns the most recent currently effective price", async () => {
      const course = await createCourse({
        title: "Priced Course",
        summary: "Price history",
        description: descriptionDoc("Price history"),
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
        description: descriptionDoc("Price boundary"),
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
        description: descriptionDoc("Future pricing"),
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
  });
});
