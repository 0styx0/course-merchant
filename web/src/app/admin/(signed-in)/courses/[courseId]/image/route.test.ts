// @vitest-environment node
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { draftedAdminCourse } from "@/mocks/fixtures/admin-courses";
import {
  courseImageAsAdminError,
  courseImageAsAdminNotFound,
  courseImageAsAdminSuccess,
  courseImageAsAdminUrl,
  storedCourseImageBytes,
} from "@/mocks/handlers/get-course-image-as-admin";
import { problemResponse } from "@/mocks/problem-response";
import { server } from "@/mocks/node";

import { GET } from "./route";

// Its default export throws outside a React Server Component build
vi.mock("server-only", () => ({}));

const courseId = draftedAdminCourse.id;

function requestImageOf(id: string): Promise<Response> {
  return GET(new Request(`http://localhost/admin/courses/${id}/image`), {
    params: Promise.resolve({ courseId: id }),
  });
}

describe("GET /admin/courses/[courseId]/image", () => {
  it("serves the stored image as private, revalidated WebP", async () => {
    server.use(courseImageAsAdminSuccess);

    const response = await requestImageOf(courseId);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/webp");
    expect(response.headers.get("Cache-Control")).toBe("private, no-cache");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(
      storedCourseImageBytes,
    );
  });

  it("answers 404 for an id that isn't a UUID, without calling the API", async () => {
    const calls = { count: 0 };
    server.use(
      http.get(courseImageAsAdminUrl, () => {
        calls.count += 1;
        return new HttpResponse(null, { status: 500 });
      }),
    );

    const response = await requestImageOf("not-a-uuid");

    expect(response.status).toBe(404);
    expect(calls.count).toBe(0);
  });

  it("answers an empty 404 when the course doesn't exist", async () => {
    server.use(
      http.get(courseImageAsAdminUrl, () =>
        problemResponse(404, {
          title: "Course not found",
          detail: "No course exists with this ID.",
          code: "COURSE_NOT_FOUND",
        }),
      ),
    );

    const response = await requestImageOf(courseId);

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("");
  });

  it("answers an empty 404 when the course has no image yet", async () => {
    server.use(courseImageAsAdminNotFound);

    const response = await requestImageOf(courseId);

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("");
  });

  it("answers an empty 502 for any other API problem", async () => {
    server.use(courseImageAsAdminError);

    const response = await requestImageOf(courseId);

    expect(response.status).toBe(502);
    expect(await response.text()).toBe("");
  });

  it("throws when the API is unreachable, so Next answers 500", async () => {
    server.use(http.get(courseImageAsAdminUrl, () => HttpResponse.error()));

    await expect(requestImageOf(courseId)).rejects.toThrow();
  });
});
