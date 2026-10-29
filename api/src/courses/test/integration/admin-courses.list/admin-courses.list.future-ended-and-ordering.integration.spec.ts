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
import { createPricedCourse, descriptionDoc } from "@/test/course-fixtures.js";
import { instant } from "@/test/test-helpers.js";
import { AdminCoursesService } from "@/courses/admin/admin-courses.service.js";
import { AdminCoursesRepository } from "@/courses/repositories/admin-courses.repository.js";

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
    it("includes a course whose prices all take effect in the future", async () => {
      const { course, price } = await createPricedCourse(
        {
          title: "Future Price Course",
          summary: "Not publicly available yet",
          description: descriptionDoc("Not publicly available yet"),
        },
        {
          amount: 12900,
          currency: "USD",
          effectiveAt: instant("2027-01-01T00:00:00Z"),
        },
      );

      const result = await service.findAllAdmin();

      const listedCourse = result.courses.find((item) => item.id === course.id);

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
          summary: "This course has finished",
          description: descriptionDoc("This course has finished"),
          startsAt: instant("2025-09-27T18:00:00Z"),
          endsAt: instant("2025-09-27T20:00:00Z"),
          timeZone: "America/New_York",
        },
        {
          effectiveAt: instant("2025-01-01T00:00:00Z"),
        },
      );

      const result = await service.findAllAdmin();

      const listedCourse = result.courses.find((item) => item.id === course.id);

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
  });
});
