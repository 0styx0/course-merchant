import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { server } from "@/mocks/server";
import {
  coursesError,
  coursesSuccess,
} from "@/mocks/handlers/courses/list-courses";
import {
  courseImageNotFound,
  courseImageSuccess,
  courseImageUrl,
} from "@/mocks/handlers/courses/get-course-image";
import { publicCourses } from "@/mocks/fixtures/courses";
import { mockCourseImageBytes } from "@/mocks/fixtures/mock-course-image";
import { getCourseImage, listCourses } from "./courses.api";

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

describe("getCourseImage", () => {
  it("returns the bytes and the API's Cache-Control", async () => {
    server.use(courseImageSuccess);

    const result = await getCourseImage(publicCourses[0].id, "1");

    expect(result).toEqual({
      state: "success",
      data: {
        bytes: expect.toSatisfy((bytes: ArrayBuffer) =>
          Buffer.from(bytes).equals(mockCourseImageBytes),
        ),
        cacheControl: "public, max-age=31536000, immutable",
      },
    });
  });

  it("holds null when the API sends no Cache-Control", async () => {
    server.use(
      http.get(courseImageUrl, () => new HttpResponse(mockCourseImageBytes)),
    );

    const result = await getCourseImage(publicCourses[0].id, "1");

    expect(result.state === "success" && result.data.cacheControl).toBeNull();
  });

  it("returns the problem when the API answers with one", async () => {
    server.use(courseImageNotFound);

    await expect(getCourseImage(publicCourses[0].id, "1")).resolves.toEqual({
      state: "failure",
      error: expect.objectContaining({ code: "COURSE_NOT_FOUND" }),
    });
  });

  it("throws when an error answer has no problem body", async () => {
    server.use(
      http.get(courseImageUrl, () => new HttpResponse(null, { status: 500 })),
    );

    await expect(getCourseImage(publicCourses[0].id, "1")).rejects.toThrow(
      "API answered 500 without a problem body",
    );
  });
});
