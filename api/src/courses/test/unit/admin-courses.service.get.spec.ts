import { beforeEach, describe, expect, it, vi } from "vitest";

import { instant } from "../../../test/test-helpers.js";
import type {
  CourseRepositoryModelAdmin,
  CoursesRepository,
} from "../../courses.repository/courses.repository.js";
import { AdminCoursesService } from "@/courses/admin-courses.service.js";
import { toAdminCourseResponse } from "@/courses/courses.mapper.js";

const COURSE_ID = "crs_01HZX3";

const repositoryCourse = {
  id: COURSE_ID,
  title: "React Fundamentals",
  description: "Learn the fundamentals of React",
  startsAt: instant("2026-10-01T18:00:00.000Z"),
  endsAt: instant("2026-10-01T20:00:00.000Z"),
  timeZone: "America/New_York",
  statuses: [
    {
      name: "published",
      changedAt: instant("2026-09-29T14:00:00.000Z"),
    },
  ],
  prices: [
    {
      id: "price_early",
      amount: 7900,
      currency: "USD",
      effectiveAt: instant("2026-10-20T04:00:00.000Z"),
    },
  ],
  enrollments: [],
} satisfies CourseRepositoryModelAdmin;

describe("AdminCoursesService", () => {
  let service: AdminCoursesService;

  let coursesRepository: {
    findCourseDetailsByIdAdmin: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    coursesRepository = {
      findCourseDetailsByIdAdmin: vi.fn(),
    };

    service = new AdminCoursesService(
      coursesRepository as unknown as CoursesRepository,
    );
  });

  describe("findByIdAdmin", () => {
    it("returns the mapped course from the repository", async () => {
      coursesRepository.findCourseDetailsByIdAdmin.mockResolvedValue(
        repositoryCourse,
      );

      const result = await service.findByIdAdmin(COURSE_ID);

      expect(result).toEqual(
        toAdminCourseResponse(repositoryCourse),
      );
    });

    it("passes the course ID to the repository unchanged", async () => {
      coursesRepository.findCourseDetailsByIdAdmin.mockResolvedValue(
        repositoryCourse,
      );

      await service.findByIdAdmin(COURSE_ID);

      expect(
        coursesRepository.findCourseDetailsByIdAdmin,
      ).toHaveBeenCalledExactlyOnceWith(COURSE_ID);
    });

    it("returns 404 COURSE_NOT_FOUND when the course does not exist", async () => {
      coursesRepository.findCourseDetailsByIdAdmin.mockResolvedValue(
        null,
      );

      await expect(
        service.findByIdAdmin(COURSE_ID),
      ).rejects.toMatchObject({
        status: 404,
        response: {
          title: "Course not found",
          code: "COURSE_NOT_FOUND",
        },
      });
    });

    it("propagates repository errors", async () => {
      const error = new Error("Database unavailable");

      coursesRepository.findCourseDetailsByIdAdmin.mockRejectedValue(
        error,
      );

      await expect(
        service.findByIdAdmin(COURSE_ID),
      ).rejects.toBe(error);
    });
  });
});