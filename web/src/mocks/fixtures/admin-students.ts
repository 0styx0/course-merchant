import type { AdminCustomer } from "@/lib/types";

import { reactCourse } from "./courses";

const reactFundamentals = { id: reactCourse.id, name: reactCourse.name };
const introToTypeScript = {
  id: "e2b4a6c8-3d15-4f97-8a0b-1c2d3e4f5a67",
  name: "Intro to TypeScript",
};
const cssLayout = {
  id: "f1a3c5e7-4b26-4d08-9b1c-2d3e4f5a6b78",
  name: "CSS Layout",
};

/** In the order the API answers: newest customer first. */
export const adminCustomers = [
  {
    id: "3a1c5e7b-9d24-4f60-8b13-5c7e9a1b3d51",
    name: "Sam Ortiz",
    email: "sam@example.com",
    latestCheckoutStartedAt: "2026-11-09T15:00:00Z",
    enrollments: [
      {
        course: reactFundamentals,
        enrolledAt: "2026-11-09T15:05:00Z",
        revokedAt: null,
        suspendedAt: null,
      },
      {
        course: introToTypeScript,
        enrolledAt: "2026-10-02T15:05:00Z",
        revokedAt: null,
        suspendedAt: null,
      },
      {
        course: cssLayout,
        enrolledAt: "2026-09-01T15:05:00Z",
        revokedAt: null,
        suspendedAt: null,
      },
    ],
  },
  {
    id: "4b2d6f8c-0e35-4a71-9c24-6d8f0b2c4e62",
    name: "Noa Levi",
    email: "noa@example.com",
    latestCheckoutStartedAt: "2026-11-07T10:00:00Z",
    enrollments: [
      {
        course: reactFundamentals,
        enrolledAt: "2026-11-07T10:05:00Z",
        revokedAt: null,
        suspendedAt: null,
      },
    ],
  },
  {
    id: "5c3e7a9d-1f46-4b82-8d35-7e9a1c3d5f73",
    name: "Lee Park",
    email: "lee@example.com",
    latestCheckoutStartedAt: "2026-10-30T12:00:00Z",
    enrollments: [
      {
        course: introToTypeScript,
        enrolledAt: "2026-10-30T12:05:00Z",
        revokedAt: null,
        suspendedAt: "2026-11-05T09:00:00Z",
      },
    ],
  },
  {
    id: "6d4f8b0e-2a57-4c93-9e46-8f0b2d4e6a84",
    name: "Ben Shaw",
    email: "ben@example.com",
    latestCheckoutStartedAt: "2026-10-27T14:00:00Z",
    enrollments: [
      {
        course: cssLayout,
        enrolledAt: "2026-10-27T14:05:00Z",
        revokedAt: "2026-11-01T11:00:00Z",
        suspendedAt: null,
      },
    ],
  },
  {
    id: "7e5a9c1f-3b68-4da4-8f57-9a1c3e5f7b95",
    name: "Dana Cohen",
    email: "dana@example.com",
    latestCheckoutStartedAt: "2026-11-02T08:00:00Z",
    enrollments: [
      {
        course: reactFundamentals,
        enrolledAt: "2026-11-02T08:05:00Z",
        revokedAt: null,
        suspendedAt: null,
      },
      {
        course: cssLayout,
        enrolledAt: "2026-09-15T08:05:00Z",
        revokedAt: null,
        suspendedAt: null,
      },
    ],
  },
  {
    id: "8f6b0d2a-4c79-4eb5-9a68-0b2d4f6a8ca6",
    name: "Tal Ben",
    email: "tal@example.com",
    latestCheckoutStartedAt: "2026-11-03T16:00:00Z",
    enrollments: [],
  },
] as const satisfies AdminCustomer[];
