import { describe, expect, it } from "vitest";

import { instant } from "../../../../test/test-helpers.js";
import { toAdminCourseResponse } from "@/courses/courses.mapper.js";
import { CourseRepositoryModelAdmin } from "@/courses/repositories/admin-courses.repository.js";
import { repositoryCourse } from "@/courses/test/unit/admin-courses.mapper/admin-courses.mapper.fixtures.js";

describe("toAdminCourseResponse", () => {
  it("maps each customer's payment details to the corresponding enrollment", () => {
    const result = toAdminCourseResponse(repositoryCourse);

    expect(result.enrollments).toEqual([
      {
        revokedAt: null,
        suspendedAt: null,
        emailStatus: "sent",
        customer: {
          id: "customer_1",
          name: "Ada Lovelace",
          email: "ada@example.com",
        },
        payment: {
          status: "succeeded",
          amount: 7900,
          paidAt: "2026-09-29T15:00:00Z",
        },
      },
      {
        revokedAt: "2026-09-28T09:00:00Z",
        suspendedAt: null,
        emailStatus: "failed",
        customer: {
          id: "customer_2",
          name: "Grace Hopper",
          email: "grace@example.com",
        },
        payment: {
          status: "refunded",
          amount: 9900,
          paidAt: "2026-09-27T10:00:00Z",
        },
      },
    ]);
  });

  it("maps a stored image to its UTC time and epoch-millisecond version", () => {
    const course = {
      ...repositoryCourse,
      image: { updatedAt: instant("2026-09-30T12:00:00Z") },
    } satisfies CourseRepositoryModelAdmin;

    const result = toAdminCourseResponse(course);

    expect(result.image).toEqual({
      updatedAt: "2026-09-30T12:00:00Z",
      version: String(Date.parse("2026-09-30T12:00:00Z")),
    });
  });

  it("returns an empty enrollment list when there are no enrollments", () => {
    const course = {
      ...repositoryCourse,
      enrollments: [],
    } satisfies CourseRepositoryModelAdmin;

    const result = toAdminCourseResponse(course);

    expect(result.enrollments).toEqual([]);
  });

  it("maps a free enrollment's missing payment to null", () => {
    const course = {
      ...repositoryCourse,
      enrollments: [
        {
          revokedAt: null,
          suspendedAt: instant("2026-09-30T08:00:00Z"),
          customer: {
            id: "customer_3",
            name: "Katherine Johnson",
            email: "katherine@example.com",
          },
          emails: [],
          payment: null,
        },
      ],
    } satisfies CourseRepositoryModelAdmin;

    expect(toAdminCourseResponse(course).enrollments).toEqual([
      {
        revokedAt: null,
        suspendedAt: "2026-09-30T08:00:00Z",
        emailStatus: "failed",
        customer: {
          id: "customer_3",
          name: "Katherine Johnson",
          email: "katherine@example.com",
        },
        payment: null,
      },
    ]);
  });
});
