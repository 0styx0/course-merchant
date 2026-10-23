import { Temporal } from "@js-temporal/polyfill";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fakePrisma, instant } from "../../../test/test-helpers.js";
import type {
  CourseRepositoryModelPublic,
  CoursesRepository,
} from "../../courses.repository/courses.repository.js";
import { CoursesService } from "../../courses.service.js";
import { toPublicCourseResponse } from "@/courses/courses.mapper.js";

const NOW = instant("2026-09-29T14:00:00Z");
const COURSE_ID = "crs_01HZX3";

const repositoryCourse = {
  id: COURSE_ID,
  title: "React Fundamentals",
  description: "Learn the fundamentals of React",
  startsAt: instant("2026-10-01T18:00:00Z"),
  endsAt: instant("2026-10-01T20:00:00Z"),
  timeZone: "America/New_York",
  prices: [
    {
      amount: 9900,
      currency: "USD",
    },
  ],
  enrollments: 12,
} satisfies CourseRepositoryModelPublic;

describe("CoursesService", () => {
  let service: CoursesService;

  let coursesRepository: {
    findById: ReturnType<typeof vi.fn>;
  };

  const { prisma, db } = fakePrisma();

  beforeEach(() => {
    vi.spyOn(Temporal.Now, "instant").mockReturnValue(NOW);

    coursesRepository = {
      findById: vi.fn(),
    };

    service = new CoursesService(
      prisma,
      coursesRepository as unknown as CoursesRepository,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("findById", () => {
    it("returns the mapped public course", async () => {
      coursesRepository.findById.mockResolvedValue(repositoryCourse);

      const result = await service.findById(COURSE_ID);

      expect(result).toEqual(toPublicCourseResponse(repositoryCourse));
    });

    it("passes the course ID and current instant to the repository", async () => {
      coursesRepository.findById.mockResolvedValue(repositoryCourse);

      await service.findById(COURSE_ID);

      expect(coursesRepository.findById).toHaveBeenCalledExactlyOnceWith(
        db,
        COURSE_ID,
        NOW,
      );
    });

    it("returns 404 COURSE_NOT_FOUND when the course does not exist", async () => {
      coursesRepository.findById.mockResolvedValue(null);

      await expect(service.findById(COURSE_ID)).rejects.toMatchObject({
        status: 404,
        response: {
          title: "Course not found",
          code: "COURSE_NOT_FOUND",
        },
      });
    });

    it("propagates repository errors", async () => {
      const error = new Error("Database unavailable");

      coursesRepository.findById.mockRejectedValue(error);

      await expect(service.findById(COURSE_ID)).rejects.toBe(error);
    });
  });
});
