import { instant } from "../../../../test/test-helpers.js";
import { CourseRepositoryModelAdmin } from "@/courses/repositories/admin-courses.repository.js";
import { descriptionDoc } from "@/test/course-fixtures.js";

export const COURSE_ID = "crs_01HZX3";

export const repositoryCourse = {
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
    {
      name: "archived",
      changedAt: instant("2026-09-28T14:00:00Z"),
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
    {
      id: "price_later",
      amount: 9900,
      currency: "USD",
      effectiveAt: instant("2026-11-15T05:00:00Z"),
    },
  ],

  enrollments: [
    {
      revokedAt: null,
      suspendedAt: null,
      customer: {
        id: "customer_1",
        name: "Ada Lovelace",
        email: "ada@example.com",
      },
      emails: [{ email: { status: "sent" } }],
      payment: {
        status: "succeeded",
        amount: 7900,
        paidAt: instant("2026-09-29T15:00:00Z"),
      },
    },
    {
      revokedAt: instant("2026-09-28T09:00:00Z"),
      suspendedAt: null,
      customer: {
        id: "customer_2",
        name: "Grace Hopper",
        email: "grace@example.com",
      },
      emails: [],
      payment: {
        status: "refunded",
        amount: 9900,
        paidAt: instant("2026-09-27T10:00:00Z"),
      },
    },
  ],
} satisfies CourseRepositoryModelAdmin;
