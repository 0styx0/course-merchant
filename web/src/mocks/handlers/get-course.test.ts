// @vitest-environment node
import { describe, expect, it } from "vitest";

import { publicCourses } from "../fixtures/courses";
import { MOCK_API_BASE_URL } from "../mock-api";
import { server } from "../node";
import { getCourseHandlers } from "./get-course";

const courseUrl = (courseId: string) =>
  `${MOCK_API_BASE_URL}/v1/courses/${courseId}`;

const unknownCourseId = "00000000-0000-4000-8000-000000000000";

describe("success scenario", () => {
  it.each(publicCourses)("returns $name for its id", async (course) => {
    server.use(getCourseHandlers.success);

    const response = await fetch(courseUrl(course.id));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(course);
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
