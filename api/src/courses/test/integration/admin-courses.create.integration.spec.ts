import { Test, type TestingModule } from "@nestjs/testing";
import { Temporal } from "@js-temporal/polyfill";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { PrismaService } from "@/prisma/prisma.service.js";
import { AdminCoursesService } from "@/courses/admin/admin-courses.service.js";
import { AdminCoursesRepository } from "@/courses/repositories/admin-courses.repository.js";
import { CreateCourseRequest } from "types.js";
import { toDatabasePrecision } from "@/test/test-helpers.js";
import { descriptionDoc } from "@/test/course-fixtures.js";

describe("AdminCoursesService (integration)", () => {
  let moduleRef: TestingModule;
  let service: AdminCoursesService;
  let repository: AdminCoursesRepository;
  let prisma: PrismaService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [AdminCoursesService, AdminCoursesRepository, PrismaService],
    }).compile();

    service = moduleRef.get(AdminCoursesService);
    repository = moduleRef.get(AdminCoursesRepository);
    prisma = moduleRef.get(PrismaService);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  function makeCreateRequest(): CreateCourseRequest {
    const now = Temporal.Now.instant();
    const startsAt = now.add({ hours: 3 });

    return {
      name: `Integration course ${randomUUID()}`,
      summary: "Course created by an integration test.",
      description: descriptionDoc("Course created by an integration test."),
      contentUrl: "https://drive.google.com/drive/folders/integration",
      status: "drafted",
      schedule: {
        startTime: startsAt.toString(),
        endTime: startsAt.add({ hours: 1 }).toString(),
        timeZone: "UTC",
      },
      prices: [
        {
          amount: 2500,
          currency: "USD",
          effectiveAt: now.add({ hours: 1 }).toString(),
        },
      ],
    };
  }

  async function findCreatedCourse(courseId: string) {
    const course = await repository.findCourseDetailsByIdAdmin(
      prisma.db,
      courseId,
    );

    expect(course).not.toBeNull();

    if (course === null) {
      throw new Error(`Expected course ${courseId} to exist.`);
    }

    return course;
  }

  describe("createCourse", () => {
    it("saves nothing when a later write fails", async () => {
      const request = makeCreateRequest();

      // two prices with the same effectiveAt violate the unique constraint
      // after the course row is already inserted
      request.prices.push({ ...request.prices[0] });

      await expect(service.createCourse(request)).rejects.toThrow();

      const saved = await prisma.db.orm.public.Course.where((course) =>
        course.title.eq(request.name),
      ).all();

      expect(saved).toEqual([]);
    });

    it("persists a course, its initial status, and its price", async () => {
      const request = makeCreateRequest();

      const created = await service.createCourse(request);
      const persisted = await findCreatedCourse(created.id);

      expect(persisted).toMatchObject({
        id: created.id,
        title: request.name,
        summary: request.summary,
        description: request.description,
        contentUrl: request.contentUrl,
        timeZone: request.schedule.timeZone,
      });

      expect(persisted.startsAt.toString()).toBe(
        toDatabasePrecision(request.schedule.startTime),
      );

      expect(persisted.endsAt.toString()).toBe(
        toDatabasePrecision(request.schedule.endTime),
      );

      expect(persisted.statuses).toHaveLength(1);
      expect(persisted.statuses[0].name).toBe(request.status);
      expect(persisted.statuses[0].changedAt).toBeInstanceOf(Temporal.Instant);

      expect(persisted.prices).toHaveLength(1);
      expect(persisted.prices[0]).toMatchObject({
        amount: 2500,
        currency: "USD",
      });
      expect(persisted.prices[0].id).toBeTruthy();
      expect(persisted.prices[0].effectiveAt.toString()).toBe(
        toDatabasePrecision(request.prices[0].effectiveAt),
      );

      expect(persisted.enrollments).toEqual([]);
    });

    it("persists all prices and returns them ordered by effective time", async () => {
      const request = makeCreateRequest();
      const startsAt = Temporal.Instant.from(request.schedule.startTime);

      const earlierEffectiveAt = startsAt.subtract({ hours: 2 }).toString();

      const laterEffectiveAt = startsAt.subtract({ hours: 1 }).toString();

      // Deliberately provide prices in reverse chronological order.
      request.prices = [
        {
          amount: 5000,
          currency: "USD",
          effectiveAt: laterEffectiveAt,
        },
        {
          amount: 2500,
          currency: "USD",
          effectiveAt: earlierEffectiveAt,
        },
      ];

      const created = await service.createCourse(request);
      const persisted = await findCreatedCourse(created.id);

      expect(
        persisted.prices.map((price) => ({
          amount: price.amount,
          currency: price.currency,
          effectiveAt: price.effectiveAt.toString(),
        })),
      ).toEqual([
        {
          amount: 2500,
          currency: "USD",
          effectiveAt: toDatabasePrecision(earlierEffectiveAt),
        },
        {
          amount: 5000,
          currency: "USD",
          effectiveAt: toDatabasePrecision(laterEffectiveAt),
        },
      ]);

      expect(new Set(persisted.prices.map((price) => price.id)).size).toBe(2);
    });

    it("rolls back course creation when price persistence fails", async () => {
      const request = makeCreateRequest();
      const price = request.prices[0];

      // The database has a unique constraint on courseId + effectiveAt.
      // Duplicate effective times should make the transaction fail.
      request.prices = [
        price,
        {
          ...price,
          amount: price.amount + 1000,
        },
      ];

      await expect(service.createCourse(request)).rejects.toThrow();

      const matchingCourses = await prisma.db.orm.public.Course.where(
        (course) => course.title.eq(request.name),
      ).all();

      expect(matchingCourses).toHaveLength(0);
    });
  });
});
