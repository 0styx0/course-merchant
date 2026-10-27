import type { Course } from "@/lib/types";

/** Sample courses shared by the MSW handlers, Vitest and the browser tests. */
export const reactCourse = {
  id: "0b8f2d2a-5c1e-4f6b-9a37-1d2c3e4f5a61",
  name: "React Fundamentals",
  summary: "Learn React",
  description: "Components, hooks and state, from the ground up.",
  enrollmentCount: 12,
  image: { version: "1790856000000" },
  price: {
    amount: 9900,
    currency: "USD",
  },
  schedule: {
    startTime: "2026-10-01T18:00:00Z",
    endTime: "2026-10-01T20:00:00Z",
    timeZone: "America/New_York",
  },
} as const satisfies Course;

export const typescriptCourse = {
  id: "7c4e9a10-3b2d-4e8f-b6a5-9f8e7d6c5b42",
  name: "Advanced TypeScript",
  summary: "Build robust applications with TypeScript",
  description: "Generics, conditional types and type-safe APIs in practice.",
  enrollmentCount: 37,
  image: { version: "1790856000000" },
  price: {
    amount: 14900,
    currency: "USD",
  },
  schedule: {
    startTime: "2026-10-02T22:00:00Z",
    endTime: "2026-10-03T00:00:00Z",
    timeZone: "America/New_York",
  },
} as const satisfies Course;
