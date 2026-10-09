import type { operations } from "@/lib/api/generated";
import { delay, http, HttpResponse } from "msw";
import { apiBaseUrl } from "./handler-utils";
import { coursesResponse } from "./courses.list";

type GetCourseResponse =
  operations["getCourse"]["responses"][200]["content"]["application/json"];

type InvalidCourseIdResponse =
  operations["getCourse"]["responses"][400]["content"]["application/problem+json"];

type CourseNotFoundResponse =
  operations["getCourse"]["responses"][404]["content"]["application/problem+json"];

type InternalServerErrorResponse =
  operations["getCourse"]["responses"][500]["content"]["application/problem+json"];

export const courseByIdUrl = `${apiBaseUrl}/v1/courses/:courseId`;

export const courseResponse: GetCourseResponse =
  coursesResponse.courses[0];

export const courseByIdSuccess = http.get(courseByIdUrl, () => {
  return HttpResponse.json(courseResponse);
});

export const courseByIdNotFound = http.get(
  courseByIdUrl,
  ({ params }) => {
    const body = {
      title: "Course not found",
      detail: `No course exists with ID ${params.courseId}.`,
      code: "COURSE_NOT_FOUND",
    } satisfies CourseNotFoundResponse;

    return HttpResponse.json(body, {
      status: 404,
      headers: {
        "Content-Type": "application/problem+json",
      },
    });
  },
);

export const courseByIdInvalidId = http.get(courseByIdUrl, ({ params }) => {
  const body = {
    title: "Invalid course ID",
    detail: `'${params.courseId}' is not a valid course identifier.`,
    code: "INVALID_COURSE_ID",
  } satisfies InvalidCourseIdResponse;

  return HttpResponse.json(body, {
    status: 400,
    headers: {
      "Content-Type": "application/problem+json",
    },
  });
});

export const courseByIdError = http.get(courseByIdUrl, () => {
  const body = {
    title: "Internal server error",
    detail: "An unexpected error occurred.",
    code: "INTERNAL_SERVER_ERROR",
  } satisfies InternalServerErrorResponse;

  return HttpResponse.json(body, {
    status: 500,
    headers: {
      "Content-Type": "application/problem+json",
    },
  });
});

export const courseByIdSlow = http.get(courseByIdUrl, async () => {
  await delay(1000);
  return HttpResponse.json(courseResponse);
});

export const courseByIdHandlers = {
  success: courseByIdSuccess,
  notFound: courseByIdNotFound,
  invalidId: courseByIdInvalidId,
  error: courseByIdError,
  slow: courseByIdSlow,
};