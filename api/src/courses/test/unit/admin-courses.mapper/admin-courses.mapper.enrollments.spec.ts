import { describe, expect, it } from "vitest";

import { instant } from "../../../../test/test-helpers.js";
import { toAdminCourseResponse } from "@/courses/courses.mapper.js";
import { CourseRepositoryModelAdmin } from "@/courses/repositories/admin-courses.repository.js";
import {
  NO_OWED_CUSTOMER_IDS,
  repositoryCourse,
} from "@/courses/test/unit/admin-courses.mapper/admin-courses.mapper.fixtures.js";

describe("toAdminCourseResponse", () => {
  it("maps each enrollment's times, email, customer and payment", () => {
    const result = toAdminCourseResponse(
      repositoryCourse,
      NO_OWED_CUSTOMER_IDS,
    );

    expect(result.enrollments).toEqual([
      {
        enrolledAt: "2026-09-29T15:00:00Z",
        revokedAt: null,
        suspendedAt: null,
        latestEmail: { kind: "access_granted", status: "sent" },
        refundStatus: "not_owed",
        customer: {
          id: "customer_1",
          name: "Ada Lovelace",
          email: "ada@example.com",
        },
        payment: {
          status: "succeeded",
          amount: 7900,
          currency: "USD",
          paidAt: "2026-09-29T15:00:00Z",
        },
      },
      {
        enrolledAt: "2026-09-27T10:00:00Z",
        revokedAt: "2026-09-28T09:00:00Z",
        suspendedAt: null,
        latestEmail: { kind: "access_granted", status: "failed" },
        refundStatus: "not_owed",
        customer: {
          id: "customer_2",
          name: "Grace Hopper",
          email: "grace@example.com",
        },
        payment: {
          status: "refunded",
          amount: 9900,
          currency: "USD",
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

    const result = toAdminCourseResponse(course, NO_OWED_CUSTOMER_IDS);

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

    const result = toAdminCourseResponse(course, NO_OWED_CUSTOMER_IDS);

    expect(result.enrollments).toEqual([]);
  });

  it("maps a free enrollment's missing payment to null and keeps its enrollment time", () => {
    const course = {
      ...repositoryCourse,
      enrollments: [
        {
          purchasedAt: instant("2026-09-30T07:00:00Z"),
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

    expect(
      toAdminCourseResponse(course, NO_OWED_CUSTOMER_IDS).enrollments,
    ).toEqual([
      {
        enrolledAt: "2026-09-30T07:00:00Z",
        revokedAt: null,
        suspendedAt: "2026-09-30T08:00:00Z",
        latestEmail: { kind: "access_suspended", status: "failed" },
        refundStatus: "not_owed",
        customer: {
          id: "customer_3",
          name: "Katherine Johnson",
          email: "katherine@example.com",
        },
        payment: null,
      },
    ]);
  });

  it("names the access email as failed when an active enrollment has no email", () => {
    const [ada] = repositoryCourse.enrollments;
    const course = {
      ...repositoryCourse,
      enrollments: [{ ...ada, emails: [] }],
    } satisfies CourseRepositoryModelAdmin;

    const [enrollment] = toAdminCourseResponse(
      course,
      NO_OWED_CUSTOMER_IDS,
    ).enrollments;

    expect(enrollment.latestEmail).toEqual({
      kind: "access_granted",
      status: "failed",
    });
  });

  it("names the suspension email as failed when a suspended enrollment has no email", () => {
    const [ada] = repositoryCourse.enrollments;
    const course = {
      ...repositoryCourse,
      enrollments: [
        { ...ada, suspendedAt: instant("2026-09-30T08:00:00Z"), emails: [] },
      ],
    } satisfies CourseRepositoryModelAdmin;

    const [enrollment] = toAdminCourseResponse(
      course,
      NO_OWED_CUSTOMER_IDS,
    ).enrollments;

    expect(enrollment.latestEmail).toEqual({
      kind: "access_suspended",
      status: "failed",
    });
  });

  // the repository lists the newest email first. Suspended, so the test also
  // shows a queued email wins over the missing-email kind
  it("reports the kind and status of the first, newest email", () => {
    const [ada] = repositoryCourse.enrollments;
    const course = {
      ...repositoryCourse,
      enrollments: [
        {
          ...ada,
          suspendedAt: instant("2026-09-30T08:00:00Z"),
          emails: [
            { email: { kind: "already_owned", status: "pending" } },
            { email: { kind: "access_granted", status: "failed" } },
          ],
        },
      ],
    } satisfies CourseRepositoryModelAdmin;

    const [enrollment] = toAdminCourseResponse(
      course,
      NO_OWED_CUSTOMER_IDS,
    ).enrollments;

    expect(enrollment.latestEmail).toEqual({
      kind: "already_owned",
      status: "pending",
    });
  });

  it("marks only the enrollments of customers owed a refund as owed", () => {
    const result = toAdminCourseResponse(
      repositoryCourse,
      new Set(["customer_2"]),
    );

    expect(
      result.enrollments.map((enrollment) => [
        enrollment.customer.id,
        enrollment.refundStatus,
      ]),
    ).toEqual([
      ["customer_1", "not_owed"],
      ["customer_2", "owed"],
    ]);
  });
});
