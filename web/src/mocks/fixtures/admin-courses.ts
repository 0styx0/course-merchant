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
      revokedAt: null,
      suspendedAt: null,
      emailStatus: "sent",
      refundStatus: "not_owed",
      customer: {
        id: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
        name: "Ada Lovelace",
        email: "ada@example.com",
      },
      payment: {
        status: "succeeded",
        amount: 9900,
        paidAt: "2026-10-16T10:00:00Z",
      },
    },
  ],
} as const satisfies AdminCourse;
