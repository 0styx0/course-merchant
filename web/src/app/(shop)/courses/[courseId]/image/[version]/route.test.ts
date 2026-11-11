// @vitest-environment node
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { publicCourses } from "@/mocks/fixtures/courses";
import {
  courseImageError,
  courseImageNotFound,
  courseImageSuccess,
  courseImageUrl,
} from "@/mocks/handlers/courses/get-course-image";
import { problemResponse } from "@/mocks/problem-response";
import { server } from "@/mocks/server";
import { mockCourseImageBytes } from "@/mocks/fixtures/mock-course-image";

import { GET } from "./route";

// Its default export throws outside a React Server Component build
vi.mock("server-only", () => ({}));

const courseId = publicCourses[0].id;
const version = "1793102400000";

function requestImageOf(id: string, imageVersion: string): Promise<Response> {
  return GET(
    new Request(`http://localhost/courses/${id}/image/${imageVersion}`),
    { params: Promise.resolve({ courseId: id, version: imageVersion }) },
  );
}

function countCallsToImageEndpoint(): { count: number } {
  const calls = { count: 0 };
  server.use(
    http.get(courseImageUrl, () => {
      calls.count += 1;
      return new HttpResponse(null, { status: 500 });
    }),
  );
  return calls;
}

describe("GET /courses/[courseId]/image/[version]", () => {
  it("serves the image as WebP with the API's Cache-Control", async () => {
    server.use(courseImageSuccess);

    const response = await requestImageOf(courseId, version);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/webp");
    expect(response.headers.get("Cache-Control")).toBe(
      "public, max-age=31536000, immutable",
    );
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(
      mockCourseImageBytes,
    );
  });

  it("serves the image without Cache-Control when the API sends none", async () => {
    server.use(
      http.get(
        courseImageUrl,
        () =>
          new HttpResponse(mockCourseImageBytes, {
            headers: { "Content-Type": "image/webp" },
          }),
      ),
    );

    const response = await requestImageOf(courseId, version);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/webp");
    expect(response.headers.get("Cache-Control")).toBeNull();
  });

  it("answers 404 for an id that isn't a UUID, without calling the API", async () => {
    const calls = countCallsToImageEndpoint();

    const response = await requestImageOf("not-a-uuid", version);

    expect(response.status).toBe(404);
    expect(calls.count).toBe(0);
  });

  it.each(["1a", "", "0", "007"])(
    "answers 404 for the version %j, without calling the API",
    async (badVersion) => {
      const calls = countCallsToImageEndpoint();

      const response = await requestImageOf(courseId, badVersion);

      expect(response.status).toBe(404);
      expect(calls.count).toBe(0);
    },
  );

  it("answers 404 when the API says COURSE_NOT_FOUND", async () => {
    server.use(courseImageNotFound);

    const response = await requestImageOf(courseId, version);

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("");
  });

  it("answers 404 when the API says INVALID_COURSE_ID", async () => {
    server.use(
      http.get(courseImageUrl, () =>
        problemResponse(400, {
          title: "Invalid course ID",
          detail: "The course ID must be a UUID.",
          code: "INVALID_COURSE_ID",
        }),
      ),
    );

    const response = await requestImageOf(courseId, version);

    expect(response.status).toBe(404);
  });

  it("throws when the API answers 500, so Next answers 500", async () => {
    server.use(courseImageError);

    await expect(requestImageOf(courseId, version)).rejects.toThrow(
      "INTERNAL_SERVER_ERROR",
    );
  });

  it.each([404, 400])(
    "throws when the API answers %i with another code",
    async (status) => {
      server.use(
        http.get(courseImageUrl, () =>
          problemResponse(status, {
            title: "Something else",
            detail: "Another problem.",
            code: "SOMETHING_ELSE",
          }),
        ),
      );

      await expect(requestImageOf(courseId, version)).rejects.toThrow(
        "SOMETHING_ELSE",
      );
    },
  );

  it("throws when the API is unreachable", async () => {
    server.use(http.get(courseImageUrl, () => HttpResponse.error()));

    await expect(requestImageOf(courseId, version)).rejects.toThrow();
  });
});
