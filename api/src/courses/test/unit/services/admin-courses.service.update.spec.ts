import { storedDescription } from "@/courses/courses.mapper.js";
import { Temporal } from "@js-temporal/polyfill";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AdminCoursesService } from "@/courses/admin/admin-courses.service.js";
import { toAdminCourseResponse } from "@/courses/courses.mapper.js";
import {
  AdminCoursesRepository,
  CourseRepositoryModelAdmin,
} from "@/courses/repositories/admin-courses.repository.js";
import {
  asDependency,
  fakePrisma,
  type MockMethods,
} from "@/test/test-helpers.js";
import type { UpdateCourseRequest } from "types.js";
import { descriptionDoc } from "@/test/course-fixtures.js";

const COURSE_ID = "crs_01HZX3";

function makeRepositoryCourse() {
  const now = Temporal.Now.instant();

  return {
    id: COURSE_ID,
    title: "React Fundamentals",
    summary: "Learn the fundamentals of React",
    description: descriptionDoc("Learn the fundamentals of React"),
    contentUrl: "https://drive.google.com/drive/folders/react",
    startsAt: now.add({ hours: 24 }).round({ smallestUnit: "microseconds" }),
    endsAt: now.add({ hours: 26 }).round({ smallestUnit: "microseconds" }),
    timeZone: "America/New_York",
    statuses: [
      {
        name: "published",
        changedAt: now.subtract({ hours: 72 }),
      },
    ],
    image: null,
    prices: [
      {
        id: "price_past",
        amount: 7900,
        currency: "USD",
        effectiveAt: now
          .subtract({ hours: 48 })
          .round({ smallestUnit: "microseconds" }),
      },
      {
        id: "price_future",
        amount: 9900,
        currency: "USD",
        effectiveAt: now
          .add({ hours: 12 })
          .round({ smallestUnit: "microseconds" }),
      },
    ],
    enrollments: [],
  } satisfies CourseRepositoryModelAdmin;
}

function makeRequest(course: CourseRepositoryModelAdmin): UpdateCourseRequest {
  return {
    name: course.title,
    summary: course.summary,
    description: storedDescription(course.description),
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

describe("AdminCoursesService", () => {
  let service: AdminCoursesService;
  let repositoryCourse: ReturnType<typeof makeRepositoryCourse>;

  let coursesRepository: MockMethods<
    AdminCoursesRepository,
    "findCourseDetailsByIdAdmin" | "updateCourse"
  >;

  const { prisma, tx } = fakePrisma();

  beforeEach(() => {
    repositoryCourse = makeRepositoryCourse();

    coursesRepository = {
      findCourseDetailsByIdAdmin: vi
        .fn<AdminCoursesRepository["findCourseDetailsByIdAdmin"]>()
        .mockResolvedValue(repositoryCourse),
      updateCourse: vi
        .fn<AdminCoursesRepository["updateCourse"]>()
        .mockResolvedValue(repositoryCourse),
    };

    service = new AdminCoursesService(
      prisma,
      asDependency<AdminCoursesRepository>(coursesRepository),
    );
  });

  describe("updateCourse", () => {
    it("returns the mapped updated course", async () => {
      const result = await service.updateCourse(
        COURSE_ID,
        makeRequest(repositoryCourse),
      );

      expect(result).toEqual(toAdminCourseResponse(repositoryCourse));
    });

    it("overwrites the course details", async () => {
      const request = {
        ...makeRequest(repositoryCourse),
        name: "React Advanced",
        summary: "Hooks in depth",
        description: descriptionDoc("Hooks in depth"),
        contentUrl: "https://zoom.us/j/123456789",
      };

      await service.updateCourse(COURSE_ID, request);

      expect(coursesRepository.updateCourse).toHaveBeenCalledWith(
        tx,
        COURSE_ID,
        expect.objectContaining({
          title: "React Advanced",
          summary: "Hooks in depth",
          description: descriptionDoc("Hooks in depth"),
          contentUrl: "https://zoom.us/j/123456789",
          startsAt: repositoryCourse.startsAt,
          endsAt: repositoryCourse.endsAt,
          timeZone: "America/New_York",
        }),
      );
    });

    it("does not append an unchanged status", async () => {
      await service.updateCourse(COURSE_ID, makeRequest(repositoryCourse));

      expect(coursesRepository.updateCourse).toHaveBeenCalledWith(
        tx,
        COURSE_ID,
        expect.objectContaining({ nextStatus: null }),
      );
    });

    it("appends a changed status", async () => {
      await service.updateCourse(COURSE_ID, {
        ...makeRequest(repositoryCourse),
        status: "archived",
      });

      expect(coursesRepository.updateCourse).toHaveBeenCalledWith(
        tx,
        COURSE_ID,
        expect.objectContaining({ nextStatus: "archived" }),
      );
    });

    it("replaces an edited future price and keeps the price in effect", async () => {
      const request = makeRequest(repositoryCourse);

      request.prices[1].amount = 12900;

      await service.updateCourse(COURSE_ID, request);

      expect(coursesRepository.updateCourse).toHaveBeenCalledWith(
        tx,
        COURSE_ID,
        expect.objectContaining({
          newPrices: [
            {
              amount: 12900,
              currency: "USD",
              effectiveAt: repositoryCourse.prices[1].effectiveAt,
            },
          ],
          deletePriceIds: ["price_future"],
        }),
      );
    });

    it("returns 404 COURSE_NOT_FOUND when the course does not exist", async () => {
      coursesRepository.findCourseDetailsByIdAdmin.mockResolvedValue(null);

      await expect(
        service.updateCourse(COURSE_ID, makeRequest(repositoryCourse)),
      ).rejects.toMatchObject({
        status: 404,
        response: { code: "COURSE_NOT_FOUND" },
      });

      expect(coursesRepository.updateCourse).not.toHaveBeenCalled();
    });

    it("returns 400 without writing when a rule fails", async () => {
      const request = makeRequest(repositoryCourse);

      request.prices[0].amount = 100;

      await expect(
        service.updateCourse(COURSE_ID, request),
      ).rejects.toMatchObject({
        status: 400,
        response: {
          code: "VALIDATION_FAILED",
          errors: [
            {
              field: "/prices/0/effectiveAt",
              code: "IN_PAST",
            },
          ],
        },
      });

      expect(coursesRepository.updateCourse).not.toHaveBeenCalled();
    });

    it("propagates other repository errors", async () => {
      const error = new Error("Database unavailable");

      coursesRepository.updateCourse.mockRejectedValue(error);

      await expect(
        service.updateCourse(COURSE_ID, makeRequest(repositoryCourse)),
      ).rejects.toBe(error);
    });
  });
});
