// @vitest-environment node
import { describe, expect, it } from "vitest";

import { MOCK_API_BASE_URL } from "../../mock-api";
import { server } from "../../server";
import { getCourseHandlers } from "./get-course";

const courseUrl = (courseId: string) =>
  `${MOCK_API_BASE_URL}/v1/courses/${courseId}`;

const unknownCourseId = "00000000-0000-4000-8000-000000000000";

const expectedCourses = [
  {
    id: "0b8f2d2a-5c1e-4f6b-9a37-1d2c3e4f5a61",
    name: "React Fundamentals",
    summary: "Learn React",
    enrollmentCount: 12,
    price: { amount: 9900, currency: "USD" },
  },
  {
    id: "7c4e9a10-3b2d-4e8f-b6a5-9f8e7d6c5b42",
    name: "Advanced TypeScript",
    summary: "Build robust applications with TypeScript",
    enrollmentCount: 37,
    price: { amount: 14900, currency: "USD" },
  },
  {
    id: "d3a1f6e8-2c47-4b90-8e15-6a7b8c9d0e13",
    name: "Mindful Breathing",
    summary: "Five calm minutes a day",
    enrollmentCount: 0,
    price: { amount: 0, currency: "USD" },
  },
];

describe("success scenario", () => {
  it.each(expectedCourses)("returns $name for its id", async (course) => {
    server.use(getCourseHandlers.success);

    const response = await fetch(courseUrl(course.id));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject(course);
  });

  it("answers COURSE_NOT_FOUND for an unknown id", async () => {
    server.use(getCourseHandlers.success);

    const response = await fetch(courseUrl(unknownCourseId));

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({
      code: "COURSE_NOT_FOUND",
    });
  });
});
