import { describe, expect, it, vi } from "vitest";

import { server } from "@/mocks/server";
import {
  coursesError,
  coursesSuccess,
} from "@/mocks/handlers/courses/list-courses";
import { publicCourses } from "@/mocks/fixtures/courses";
import { listCourses } from "./courses.api";

// Its default export throws outside a React Server Component build
vi.mock("server-only", () => ({}));

describe("listCourses", () => {
  it("returns the courses", async () => {
    server.use(coursesSuccess);

    await expect(listCourses()).resolves.toEqual({
      courses: publicCourses,
    });
  });

  it("throws when the API answers with an error", async () => {
    server.use(coursesError);

    await expect(listCourses()).rejects.toThrow(
      "listCourses failed with status 500 (INTERNAL_SERVER_ERROR)",
    );
  });
});
