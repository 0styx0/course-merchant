import { describe, expect, it, vi } from "vitest";

import { server } from "@/mocks/node";
import { coursesError, coursesSuccess } from "@/mocks/handlers/list-courses";
import { reactCourse, typescriptCourse } from "@/mocks/fixtures/courses";
import { listCourses } from "./courses.api";

// Its default export throws outside a React Server Component build
vi.mock("server-only", () => ({}));

describe("listCourses", () => {
  it("returns the courses", async () => {
    server.use(coursesSuccess);

    await expect(listCourses()).resolves.toEqual({
      courses: [reactCourse, typescriptCourse],
    });
  });

  it("throws when the API answers with an error", async () => {
    server.use(coursesError);

    await expect(listCourses()).rejects.toThrow(
      "listCourses failed with status 500 (INTERNAL_SERVER_ERROR)",
    );
  });
});
