import type { operations } from "@/lib/api/generated";
import { http, HttpResponse } from "msw";
import { mockCourseImageBytes } from "../../fixtures/mock-course-image";
import { MOCK_API_BASE_URL } from "../../mock-api";
import { problemResponse } from "../../problem-response";

type CourseNotFoundResponse =
  operations["getCourseImage"]["responses"][404]["content"]["application/problem+json"];

type InternalServerErrorResponse =
  operations["getCourseImage"]["responses"][500]["content"]["application/problem+json"];

export const courseImageUrl = `${MOCK_API_BASE_URL}/v1/courses/:courseId/image/:version`;

export const courseImageSuccess = http.get(courseImageUrl, () => {
  return new HttpResponse(mockCourseImageBytes, {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
});

export const courseImageNotFound = http.get(courseImageUrl, () => {
  const body = {
    title: "Course not found",
    detail: "No course exists with this ID.",
    code: "COURSE_NOT_FOUND",
  } satisfies CourseNotFoundResponse;

  return problemResponse(404, body);
});

export const courseImageError = http.get(courseImageUrl, () => {
  const body = {
    title: "Internal server error",
    detail: "We couldn't load this image right now. Please try again later.",
    code: "INTERNAL_SERVER_ERROR",
  } satisfies InternalServerErrorResponse;

  return problemResponse(500, body);
});

export const getCourseImageHandlers = {
  success: courseImageSuccess,
  notFound: courseImageNotFound,
  error: courseImageError,
};
