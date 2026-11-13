import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  asDependency,
  fakePrisma,
  instant,
  type MockMethods,
} from "../../../../test/test-helpers.js";
import { AdminCoursesService } from "@/courses/admin/admin-courses.service.js";
import { toAdminCourseResponse } from "@/courses/courses.mapper.js";
import {
  AdminCoursesRepository,
  CourseRepositoryModelAdmin,
} from "@/courses/repositories/admin-courses.repository.js";
import { PaymentsRepository } from "@/payments/payments.repository.js";
import { descriptionDoc } from "@/test/course-fixtures.js";

const COURSE_ID = "crs_01HZX3";

const repositoryCourse = {
  id: COURSE_ID,
  title: "React Fundamentals",
  summary: "Learn the fundamentals of React",
  description: descriptionDoc("Learn the fundamentals of React"),
  contentUrl: "https://drive.google.com/drive/folders/react",
  startsAt: instant("2026-10-01T18:00:00Z"),
  endsAt: instant("2026-10-01T20:00:00Z"),
  timeZone: "America/New_York",
  statuses: [
    {
      name: "published",
      changedAt: instant("2026-09-29T14:00:00Z"),
    },
  ],
  image: null,
  prices: [
    {
      id: "price_early",
      amount: 7900,
      currency: "USD",
      effectiveAt: instant("2026-10-20T04:00:00Z"),
    },
  ],
  enrollments: [],
} satisfies CourseRepositoryModelAdmin;

function enrollmentsOf(customerIds: string[]) {
  return customerIds.map((customerId) => ({
    revokedAt: null,
    suspendedAt: null,
    customer: {
      id: customerId,
      name: customerId,
      email: `${customerId}@example.com`,
    },
    emails: [],
    payment: null,
  }));
}

describe("AdminCoursesService", () => {
  let service: AdminCoursesService;

  let coursesRepository: MockMethods<
    AdminCoursesRepository,
    "findCourseDetailsByIdAdmin"
  >;

  let paymentsRepository: MockMethods<
    PaymentsRepository,
    "findCustomersOwedRefund"
  >;

  const { prisma, db } = fakePrisma();

  beforeEach(() => {
    coursesRepository = {
      findCourseDetailsByIdAdmin:
        vi.fn<AdminCoursesRepository["findCourseDetailsByIdAdmin"]>(),
    };

    paymentsRepository = {
      findCustomersOwedRefund: vi
        .fn<PaymentsRepository["findCustomersOwedRefund"]>()
        .mockResolvedValue([]),
    };

    service = new AdminCoursesService(
      prisma,
      asDependency<AdminCoursesRepository>(coursesRepository),
      asDependency<PaymentsRepository>(paymentsRepository),
    );
  });

  describe("findByIdAdmin", () => {
    it("returns the mapped course from the repository", async () => {
      coursesRepository.findCourseDetailsByIdAdmin.mockResolvedValue(
        repositoryCourse,
      );

      const result = await service.findByIdAdmin(COURSE_ID);

      expect(result).toEqual(
        toAdminCourseResponse(repositoryCourse, new Set()),
      );
    });

    it("passes the course ID to the repository unchanged", async () => {
      coursesRepository.findCourseDetailsByIdAdmin.mockResolvedValue(
        repositoryCourse,
      );

      await service.findByIdAdmin(COURSE_ID);

      expect(
        coursesRepository.findCourseDetailsByIdAdmin,
      ).toHaveBeenCalledExactlyOnceWith(db, COURSE_ID);
    });

    it("marks the enrollments of the buyers the payments repository reports", async () => {
      coursesRepository.findCourseDetailsByIdAdmin.mockResolvedValue({
        ...repositoryCourse,
        enrollments: enrollmentsOf(["ada-id", "bob-id"]),
      });
      paymentsRepository.findCustomersOwedRefund.mockResolvedValue([
        { courseId: COURSE_ID, customerId: "ada-id" },
        { courseId: "another-course", customerId: "bob-id" },
      ]);

      const result = await service.findByIdAdmin(COURSE_ID);

      expect(
        result.enrollments.map((enrollment) => enrollment.refundStatus),
      ).toEqual(["owed", "not_owed"]);
    });

    it("propagates a payments repository error", async () => {
      const error = new Error("Payments unavailable");
      coursesRepository.findCourseDetailsByIdAdmin.mockResolvedValue(
        repositoryCourse,
      );
      paymentsRepository.findCustomersOwedRefund.mockRejectedValue(error);

      await expect(service.findByIdAdmin(COURSE_ID)).rejects.toBe(error);
    });

    it("asks for the orphan buyers of the requested course only", async () => {
      coursesRepository.findCourseDetailsByIdAdmin.mockResolvedValue(
        repositoryCourse,
      );

      await service.findByIdAdmin(COURSE_ID);

      expect(
        paymentsRepository.findCustomersOwedRefund,
      ).toHaveBeenCalledExactlyOnceWith(db, [COURSE_ID]);
    });

    it("returns 404 COURSE_NOT_FOUND when the course does not exist", async () => {
      coursesRepository.findCourseDetailsByIdAdmin.mockResolvedValue(null);

      await expect(service.findByIdAdmin(COURSE_ID)).rejects.toMatchObject({
        status: 404,
        response: {
          title: "Course not found",
          code: "COURSE_NOT_FOUND",
        },
      });
    });

    it("propagates repository errors", async () => {
      const error = new Error("Database unavailable");

      coursesRepository.findCourseDetailsByIdAdmin.mockRejectedValue(error);

      await expect(service.findByIdAdmin(COURSE_ID)).rejects.toBe(error);
    });
  });
});
