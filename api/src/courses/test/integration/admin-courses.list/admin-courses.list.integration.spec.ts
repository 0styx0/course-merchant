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
  createPricedCourse,
  updateCourseStatus,
} from "@/test/course-fixtures.js";
import { instant } from "@/test/test-helpers.js";
import { AdminCoursesService } from "@/courses/admin-courses.service.js";
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
    it("includes a course whose latest status is published", async () => {
      const { course } = await createPricedCourse();

      const result = await service.findAllAdmin();

      const listedCourse = result.courses.find((item) => item.id === course.id);

      expect(listedCourse).toBeDefined();
      expect(listedCourse!.status.name).toBe("published");
    });

    it("includes an archived course when archived is its latest status", async () => {
      const { course } = await createPricedCourse();

      const archivedAt = course.createdAt.add({ seconds: 1 });

      await updateCourseStatus(course.id, "archived", archivedAt);

      const result = await service.findAllAdmin();

      const listedCourse = result.courses.find((item) => item.id === course.id);

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

      expect(result.courses.some((item) => item.id === course.id)).toBe(false);
    });

    it("rejects a second status with the same changedAt, so two statuses can't both be latest", async () => {
      const { course } = await createPricedCourse();
      const changedAt = course.createdAt.add({ seconds: 1 });

      await updateCourseStatus(course.id, "deleted", changedAt);

      await expect(
        updateCourseStatus(course.id, "published", changedAt),
      ).rejects.toThrow();
    });

    it("includes a course whose latest status is published, even if an older status was deleted", async () => {
      const { course } = await createPricedCourse();

      await updateCourseStatus(
        course.id,
        "deleted",
        course.createdAt.add({ seconds: 1 }),
      );

      const publishedAt = course.createdAt.add({ seconds: 2 });

      await updateCourseStatus(course.id, "published", publishedAt);

      const result = await service.findAllAdmin();

      const listedCourse = result.courses.find((item) => item.id === course.id);

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

      const listedCourse = result.courses.find((item) => item.id === course.id);

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
  });
});
