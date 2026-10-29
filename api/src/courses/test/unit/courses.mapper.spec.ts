import { describe, expect, it } from "vitest";

import { toPublicCourseResponse } from "@/courses/courses.mapper.js";
import { instant } from "../../../test/test-helpers.js";
import type { CourseRepositoryModelPublic } from "../../repositories/courses.repository.js";
import { descriptionDoc } from "@/test/course-fixtures.js";

const COURSE_ID = "crs_01HZX3";

const repositoryCourse = {
  id: COURSE_ID,
  title: "React Fundamentals",
  summary: "Learn the fundamentals of React",
  description: descriptionDoc("Learn the fundamentals of React"),
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
  enrollments: 12,
} satisfies CourseRepositoryModelPublic;

describe("toPublicCourseResponse", () => {
  it("maps a repository course to the public API response", () => {
    expect(toPublicCourseResponse(repositoryCourse)).toEqual({
      id: COURSE_ID,
      name: "React Fundamentals",
      summary: "Learn the fundamentals of React",
      description: descriptionDoc("Learn the fundamentals of React"),
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
    });
  });

  it("throws when the course has no image, which publishing rules out", () => {
    expect(() =>
      toPublicCourseResponse({ ...repositoryCourse, image: null }),
    ).toThrow(`Published course ${COURSE_ID} has no image.`);
  });
});
