import { Test, type TestingModule } from "@nestjs/testing";
import { Temporal } from "@js-temporal/polyfill";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { PrismaService } from "@/prisma/prisma.service.js";
import { AdminCoursesService } from "@/courses/admin-courses.service.js";
import {
  AdminCoursesRepository,
  CourseRepositoryModelAdmin,
} from "@/courses/courses.repository/admin-courses.repository.js";
import { createCourse, createCoursePrice } from "@/test/course-fixtures.js";
import { UpdateCourseRequest } from "types.js";

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

  // a course that has started, with one price in effect and one upcoming
  async function createStartedCourse() {
    const now = Temporal.Now.instant();

    const course = await createCourse({
      title: "React Fundamentals",
      summary: "Learn React",
      description: "Learn React",
      startsAt: now.subtract({ hours: 1 }),
      endsAt: now.add({ hours: 1 }),
      timeZone: "UTC",
    });

    const pastPrice = await createCoursePrice({
      courseId: course.id,
      amount: 5000,
      currency: "USD",
      effectiveAt: now.subtract({ hours: 48 }),
    });

    const futurePrice = await createCoursePrice({
      courseId: course.id,
      amount: 7000,
      currency: "USD",
      effectiveAt: now.add({ hours: 48 }),
    });

    return { course, pastPrice, futurePrice };
  }

  async function findCourse(
    courseId: string,
  ): Promise<CourseRepositoryModelAdmin> {
    const course = await repository.findCourseDetailsByIdAdmin(
      prisma.db,
      courseId,
    );

    if (course === null) {
      throw new Error(`Expected course ${courseId} to exist.`);
    }

    return course;
  }

  function toRequest(course: CourseRepositoryModelAdmin): UpdateCourseRequest {
    return {
      name: course.title,
      summary: course.summary,
      description: course.description,
      contentUrl: course.contentUrl,
      status: course.statuses[0].name,
      schedule: {
        startTime: course.startsAt.toString(),
        endTime: course.endsAt.toString(),
        timeZone: course.timeZone,
      },
      prices: course.prices.map((price) => ({
        amount: price.amount,
        currency: price.currency,
        effectiveAt: price.effectiveAt.toString(),
      })),
    };
  }

  describe("updateCourse", () => {
    it("overwrites the details of a course that has started", async () => {
      const { course } = await createStartedCourse();
      const request = {
        ...toRequest(await findCourse(course.id)),
        name: "React Advanced",
        summary: "Hooks in depth",
        description: "Hooks in depth",
        contentUrl: "https://zoom.us/j/123456789",
      };

      await service.updateCourse(course.id, request);

      expect(await findCourse(course.id)).toMatchObject({
        title: "React Advanced",
        summary: "Hooks in depth",
        description: "Hooks in depth",
        contentUrl: "https://zoom.us/j/123456789",
      });
    });

    it("changes nothing for an unchanged round-trip", async () => {
      const { course } = await createStartedCourse();
      const before = await findCourse(course.id);

      await service.updateCourse(course.id, toRequest(before));

      expect(await findCourse(course.id)).toMatchObject({
        prices: before.prices,
        statuses: before.statuses,
      });
    });

    it("replaces an edited future price at the same effectiveAt", async () => {
      const { course, pastPrice, futurePrice } = await createStartedCourse();
      const request = toRequest(await findCourse(course.id));

      request.prices[1].amount = 9000;

      await service.updateCourse(course.id, request);

      const { prices } = await findCourse(course.id);

      expect(prices).toHaveLength(2);
      expect(prices[0]).toMatchObject({ id: pastPrice.id, amount: 5000 });
      expect(prices[1]).toMatchObject({ amount: 9000 });
      expect(prices[1].id).not.toBe(futurePrice.id);
      expect(prices[1].effectiveAt).toEqual(futurePrice.effectiveAt);
    });

    it("deletes an omitted future price and keeps the price in effect", async () => {
      const { course, pastPrice } = await createStartedCourse();

      await service.updateCourse(course.id, {
        ...toRequest(await findCourse(course.id)),
        prices: [],
      });

      const { prices } = await findCourse(course.id);

      expect(prices.map((price) => price.id)).toEqual([pastPrice.id]);
    });

    it("adds new prices", async () => {
      const { course } = await createStartedCourse();
      const request = toRequest(await findCourse(course.id));
      const effectiveAt = Temporal.Now.instant()
        .add({ hours: 120 })
        .round({ smallestUnit: "microseconds" });

      request.prices.push({
        amount: 9900,
        currency: "USD",
        effectiveAt: effectiveAt.toString(),
      });

      await service.updateCourse(course.id, request);

      const { prices } = await findCourse(course.id);

      expect(prices).toHaveLength(3);
      expect(prices[2]).toMatchObject({ amount: 9900, effectiveAt });
    });

    it("appends a status only when it changes", async () => {
      const { course } = await createStartedCourse();
      const request = toRequest(await findCourse(course.id));

      await service.updateCourse(course.id, request);
      await service.updateCourse(course.id, {
        ...request,
        status: "archived",
      });
      await service.updateCourse(course.id, {
        ...request,
        status: "archived",
      });

      const statuses = await prisma.db.orm.public.CourseStatus.where((status) =>
        status.courseId.eq(course.id),
      ).all();

      expect(statuses.map((status) => status.name).sort()).toEqual([
        "archived",
        "published",
      ]);
      expect((await findCourse(course.id)).statuses[0].name).toBe("archived");
    });

    it("rolls back every change when a write fails", async () => {
      const { course, pastPrice } = await createStartedCourse();
      const before = await findCourse(course.id);

      // inserting at an in-effect price's effectiveAt violates the
      // unique constraint, since prices in effect are never deleted
      await expect(
        prisma.db.transaction((tx) =>
          repository.updateCourse(tx, course.id, {
            title: "Should not persist",
            summary: before.summary,
            description: before.description,
            contentUrl: before.contentUrl,
            startsAt: before.startsAt,
            endsAt: before.endsAt,
            timeZone: before.timeZone,
            nextStatus: "archived",
            newPrices: [
              {
                amount: 1000,
                currency: "USD",
                effectiveAt: pastPrice.effectiveAt,
              },
            ],
            deletePriceIds: [],
            now: Temporal.Now.instant(),
          }),
        ),
      ).rejects.toThrow();

      expect(await findCourse(course.id)).toEqual(before);
    });

    it("returns 404 COURSE_NOT_FOUND for an unknown course", async () => {
      const { course } = await createStartedCourse();
      const request = toRequest(await findCourse(course.id));

      await expect(
        service.updateCourse(crypto.randomUUID(), request),
      ).rejects.toMatchObject({
        status: 404,
        response: { code: "COURSE_NOT_FOUND" },
      });
    });
  });
});
