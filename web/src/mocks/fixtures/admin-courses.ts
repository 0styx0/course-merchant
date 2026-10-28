import type { AdminCourse } from "@/lib/types";

import { reactCourse } from "./courses";

/** What the API answers after creating a drafted course. */
export const draftedAdminCourse = {
  id: reactCourse.id,
  name: reactCourse.name,
  summary: reactCourse.summary,
  description: reactCourse.description,
  schedule: reactCourse.schedule,
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
