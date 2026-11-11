import type { operations } from "@/lib/api/generated";
import { http, HttpResponse } from "msw";
import { storedCourseImageBytes } from "../../fixtures/served-course-image";
import { MOCK_API_BASE_URL } from "../../mock-api";
import { problemResponse } from "../../problem-response";

type ImageNotFoundResponse =
  operations["getCourseImageAsAdmin"]["responses"][404]["content"]["application/problem+json"];

type InternalServerErrorResponse =
  operations["getCourseImageAsAdmin"]["responses"][500]["content"]["application/problem+json"];

export const courseImageAsAdminUrl = `${MOCK_API_BASE_URL}/v1/admin/courses/:courseId/image`;

export const courseImageAsAdminSuccess = http.get(courseImageAsAdminUrl, () => {
  return new HttpResponse(storedCourseImageBytes, {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "private, no-cache",
    },
  });
});

export const courseImageAsAdminNotFound = http.get(
  courseImageAsAdminUrl,
  () => {
    const body = {
      title: "Course image not found",
      detail: "This course has no image yet.",
      code: "COURSE_IMAGE_NOT_FOUND",
    } satisfies ImageNotFoundResponse;

    return problemResponse(404, body);
  },
);

export const courseImageAsAdminError = http.get(courseImageAsAdminUrl, () => {
  const body = {
    title: "Internal server error",
    detail: "We couldn't load this image right now. Please try again later.",
    code: "INTERNAL_SERVER_ERROR",
  } satisfies InternalServerErrorResponse;

  return problemResponse(500, body);
});

export const getCourseImageAsAdminHandlers = {
  success: courseImageAsAdminSuccess,
  notFound: courseImageAsAdminNotFound,
  error: courseImageAsAdminError,
};
