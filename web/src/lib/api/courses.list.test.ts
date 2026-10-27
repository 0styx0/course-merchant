import { describe, expect, it, vi } from "vitest";

import { server } from "@/mocks/node";
import { coursesError, coursesSuccess } from "@/mocks/handlers/courses.list";
import { reactCourse, typescriptCourse } from "@/mocks/fixtures/courses";
import { getCourses } from "./courses.list";

// Its default export throws outside a React Server Component build
vi.mock("server-only", () => ({}));

describe("getCourses", () => {
  it("returns the courses", async () => {
    server.use(coursesSuccess);

    await expect(getCourses()).resolves.toEqual({
      courses: [reactCourse, typescriptCourse],
    });
  });

  it("throws when the API answers with an error", async () => {
    server.use(coursesError);

    await expect(getCourses()).rejects.toThrow(
      "listCourses failed with status 500 (INTERNAL_SERVER_ERROR)",
    );
  });
});
