import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  asDependency,
  fakePrisma,
  instant,
  type MockMethods,
} from "../../../../test/test-helpers.js";
import { AdminCoursesService } from "@/courses/admin/admin-courses.service.js";
import {
  AdminCoursesRepository,
  CourseRepositoryModelAdmin,
} from "@/courses/repositories/admin-courses.repository.js";
import { PaymentsRepository } from "@/payments/payments.repository.js";
import { descriptionDoc } from "@/test/course-fixtures.js";

function makeRepositoryCourse(id: string) {
  return {
    id,
    title: "React Fundamentals",
    summary: "Learn the fundamentals of React",
    description: descriptionDoc("Learn the fundamentals of React"),
    contentUrl: "https://drive.google.com/drive/folders/react",
    startsAt: instant("2026-10-01T18:00:00Z"),
    endsAt: instant("2026-10-01T20:00:00Z"),
    timeZone: "America/New_York",
    statuses: [
      { name: "published", changedAt: instant("2026-09-29T14:00:00Z") },
    ],
    image: null,
    prices: [
      {
        id: `${id}-price`,
        amount: 7900,
        currency: "USD",
        effectiveAt: instant("2026-10-20T04:00:00Z"),
      },
    ],
    enrollments: [],
  } satisfies CourseRepositoryModelAdmin;
}

describe("AdminCoursesService.findAllAdmin", () => {
  let service: AdminCoursesService;
  let paymentsRepository: MockMethods<
    PaymentsRepository,
    "findCustomersOwedRefund"
  >;

  const { prisma, db } = fakePrisma();

  beforeEach(() => {
    const coursesRepository = {
      findAllCourseDetailsAdmin: vi
        .fn<AdminCoursesRepository["findAllCourseDetailsAdmin"]>()
        .mockResolvedValue([
          makeRepositoryCourse("course-1"),
          makeRepositoryCourse("course-2"),
        ]),
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

  it("asks for the orphan buyers of every listed course in one call", async () => {
    const result = await service.findAllAdmin();

    expect(result.courses).toHaveLength(2);
    expect(
      paymentsRepository.findCustomersOwedRefund,
    ).toHaveBeenCalledExactlyOnceWith(db, ["course-1", "course-2"]);
  });
});
