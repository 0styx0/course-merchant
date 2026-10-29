import { CourseRepositoryModelPublic } from "../../../repositories/courses.repository.js";
import { instant } from "../../../../test/test-helpers.js";
import { descriptionDoc } from "@/test/course-fixtures.js";

export const makeCourseRecord = (overrides = {}) =>
  ({
    id: "course-1",
    title: "React Fundamentals",
    summary: "Learn React",
    description: descriptionDoc("Learn React"),
    startsAt: instant("2026-10-01T18:00:00Z"),
    endsAt: instant("2026-10-01T20:00:00Z"),
    timeZone: "America/New_York",
    prices: [
      {
        amount: 9900,
        currency: "USD",
      },
    ],
    image: { updatedAt: instant("2026-10-01T12:00:00Z") },
    enrollments: 0,
    ...overrides,
  }) satisfies CourseRepositoryModelPublic;
