import type { AdminCourse } from "@/lib/types";

import { reactCourse } from "./courses";

/** What the API answers after creating a drafted course. */
export const draftedAdminCourse = {
  id: reactCourse.id,
  name: reactCourse.name,
  summary: reactCourse.summary,
  description: reactCourse.description,
  schedule: {
    startTime: "2026-10-01T18:00:00Z",
    endTime: "2026-10-01T20:00:00Z",
    timeZone: "America/New_York",
  },
  contentUrl: "https://example.com/course",
  status: { name: "drafted", changedAt: "2026-10-15T18:30:00Z" },
  image: null,
  enrollments: [],
  prices: [
    {
      id: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      amount: 9900,
      currency: "USD",
      effectiveAt: "2026-10-15T18:31:00Z",
    },
  ],
} as const satisfies AdminCourse;

/** A published course with a price in effect, so the shop lists it. */
export const publishedAdminCourse = {
  ...draftedAdminCourse,
  status: { name: "published", changedAt: "2026-10-15T19:00:00Z" },
} as const satisfies AdminCourse;

/** A course being edited: one price in effect and one still to come. */
export const adminCourseWithFuturePrice = {
  ...draftedAdminCourse,
  prices: [
    ...draftedAdminCourse.prices,
    {
      id: "0b7a9c3e-1f2d-4e5a-8b6c-7d8e9f0a1b2c",
      amount: 12900,
      currency: "USD",
      effectiveAt: "2099-03-01T14:00:00Z",
    },
  ],
} as const satisfies AdminCourse;

/** A course being edited that already has a stored image. */
export const adminCourseWithImage = {
  ...adminCourseWithFuturePrice,
  image: { updatedAt: "2026-10-16T09:00:00Z", version: "1760605200000" },
} as const satisfies AdminCourse;

/** A course being edited that one student has bought. */
export const adminCourseWithEnrollment = {
  ...draftedAdminCourse,
  enrollments: [
    {
      enrolledAt: "2026-10-16T10:00:00Z",
      revokedAt: null,
      suspendedAt: null,
      latestEmail: { kind: "access_granted", status: "sent" },
      refundStatus: "not_owed",
      customer: {
        id: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
        name: "Ada Lovelace",
        email: "ada@example.com",
      },
      payment: {
        status: "succeeded",
        amount: 9900,
        currency: "USD",
        paidAt: "2026-10-16T10:00:00Z",
      },
    },
  ],
} as const satisfies AdminCourse;

/**
 * A course with one student for each access, payment and email case the
 * admin page draws, in the order the API returns them.
 */
export const adminCourseWithEveryStudentCase = {
  ...draftedAdminCourse,
  enrollments: [
    {
      enrolledAt: "2026-11-02T15:00:00Z",
      revokedAt: null,
      suspendedAt: null,
      latestEmail: { kind: "already_owned", status: "failed" },
      refundStatus: "owed",
      customer: {
        id: "5a1c0d2e-7b3f-4c8a-9e6d-000000000001",
        name: "Dana Cohen",
        email: "dana@example.com",
      },
      payment: {
        status: "succeeded",
        amount: 9900,
        currency: "USD",
        paidAt: "2026-11-02T15:00:00Z",
      },
    },
    {
      enrolledAt: "2026-11-04T15:00:00Z",
      revokedAt: null,
      suspendedAt: null,
      latestEmail: { kind: "access_granted", status: "failed" },
      refundStatus: "not_owed",
      customer: {
        id: "5a1c0d2e-7b3f-4c8a-9e6d-000000000002",
        name: "Omar Haddad",
        email: "omar@example.com",
      },
      payment: {
        status: "succeeded",
        amount: 9900,
        currency: "USD",
        paidAt: "2026-11-04T15:00:00Z",
      },
    },
    {
      enrolledAt: "2026-11-07T15:00:00Z",
      revokedAt: null,
      suspendedAt: null,
      latestEmail: { kind: "access_granted", status: "failed" },
      refundStatus: "not_owed",
      customer: {
        id: "5a1c0d2e-7b3f-4c8a-9e6d-000000000003",
        name: "Noa Levi",
        email: "noa@example.com",
      },
      payment: null,
    },
    {
      enrolledAt: "2026-10-30T15:00:00Z",
      revokedAt: null,
      suspendedAt: "2026-10-30T18:00:00Z",
      latestEmail: { kind: "access_suspended", status: "failed" },
      refundStatus: "not_owed",
      customer: {
        id: "5a1c0d2e-7b3f-4c8a-9e6d-000000000004",
        name: "Lee Park",
        email: "lee@example.com",
      },
      payment: {
        status: "succeeded",
        amount: 7900,
        currency: "USD",
        paidAt: "2026-10-30T15:00:00Z",
      },
    },
    {
      enrolledAt: "2026-11-09T15:00:00Z",
      revokedAt: null,
      suspendedAt: null,
      latestEmail: { kind: "access_granted", status: "sent" },
      refundStatus: "not_owed",
      customer: {
        id: "5a1c0d2e-7b3f-4c8a-9e6d-000000000005",
        name: "Sam Ortiz",
        email:
          "samuelalexanderortizmontgomeryworkshops@verylongcompanydomainexample.com",
      },
      payment: {
        status: "succeeded",
        amount: 9900,
        currency: "USD",
        paidAt: "2026-11-09T15:00:00Z",
      },
    },
    {
      enrolledAt: "2026-10-29T15:00:00Z",
      revokedAt: "2026-11-03T15:00:00Z",
      suspendedAt: "2026-11-01T18:00:00Z",
      latestEmail: { kind: "access_suspended", status: "sent" },
      refundStatus: "not_owed",
      customer: {
        id: "5a1c0d2e-7b3f-4c8a-9e6d-000000000006",
        name: "Rina Gold",
        email: "rina@example.com",
      },
      payment: {
        status: "refunded",
        amount: 7900,
        currency: "USD",
        paidAt: "2026-10-29T15:00:00Z",
      },
    },
    {
      enrolledAt: "2026-10-28T15:00:00Z",
      revokedAt: "2026-11-05T15:00:00Z",
      suspendedAt: null,
      latestEmail: { kind: "access_granted", status: "failed" },
      refundStatus: "not_owed",
      customer: {
        id: "5a1c0d2e-7b3f-4c8a-9e6d-000000000007",
        name: "Ari Stein",
        email: "ari@example.com",
      },
      payment: {
        status: "refunded",
        amount: 7900,
        currency: "USD",
        paidAt: "2026-10-28T15:00:00Z",
      },
    },
    {
      enrolledAt: "2026-10-27T15:00:00Z",
      revokedAt: "2026-11-06T15:00:00Z",
      suspendedAt: null,
      latestEmail: { kind: "access_granted", status: "failed" },
      refundStatus: "not_owed",
      customer: {
        id: "5a1c0d2e-7b3f-4c8a-9e6d-000000000008",
        name: "Ben Shaw",
        email: "ben@example.com",
      },
      payment: null,
    },
  ],
} as const satisfies AdminCourse;
