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
import {
  archiveCourse,
  createPricedCourse,
  descriptionDoc,
} from "../../../../test/course-fixtures.js";
import { PrismaModule } from "../../../../prisma/prisma.module.js";
import { AdminCoursesService } from "@/courses/admin/admin-courses.service.js";
import { AdminCoursesRepository } from "@/courses/repositories/admin-courses.repository.js";
import { CourseImagesRepository } from "@/courses/repositories/course-images.repository.js";
import { db } from "@/prisma/db.js";

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

  afterAll(async () => {
    await testingModule.close();
  });

  describe("findByIdAdmin", () => {
    it("returns the complete admin representation of a course", async () => {
      const { course, price } = await createPricedCourse(
        {
          title: "React Fundamentals",
          summary: "Learn React",
          description: descriptionDoc("Learn React"),
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
        summary: "Learn React",
        description: descriptionDoc("Learn React"),
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
        image: { updatedAt: expect.any(String), version: expect.any(String) },
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

    it("reports a stored image's time and version, never its bytes", async () => {
      const { course } = await createPricedCourse();
      const imageTime = instant("2026-09-30T12:00:00Z");
      vi.spyOn(Temporal.Now, "instant").mockReturnValue(imageTime);
      await new CourseImagesRepository().saveImage(
        db,
        course.id,
        new Uint8Array([1, 2, 3]),
      );

      const result = await service.findByIdAdmin(course.id);

      expect(result.image).toEqual({
        updatedAt: "2026-09-30T12:00:00Z",
        version: String(imageTime.epochMilliseconds),
      });
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
          summary: "This course has finished",
          description: descriptionDoc("This course has finished"),
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
          summary: "Not publicly available yet",
          description: descriptionDoc("Not publicly available yet"),
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
  });
});
