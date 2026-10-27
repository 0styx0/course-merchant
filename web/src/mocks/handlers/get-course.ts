import type { operations } from "@/lib/api/generated";
import { delay, http, HttpResponse } from "msw";
import { MOCK_API_BASE_URL } from "../mock-api";
import { reactCourse } from "../fixtures/courses";
import { problemResponse } from "../problem-response";

type GetCourseResponse =
  operations["getCourse"]["responses"][200]["content"]["application/json"];

type InvalidCourseIdResponse =
  operations["getCourse"]["responses"][400]["content"]["application/problem+json"];

type CourseNotFoundResponse =
  operations["getCourse"]["responses"][404]["content"]["application/problem+json"];

type InternalServerErrorResponse =
  operations["getCourse"]["responses"][500]["content"]["application/problem+json"];

export const courseByIdUrl = `${MOCK_API_BASE_URL}/v1/courses/:courseId`;

const courseResponse: GetCourseResponse = reactCourse;

export const courseByIdSuccess = http.get(courseByIdUrl, () => {
  return HttpResponse.json(courseResponse);
});

export const courseByIdNotFound = http.get(courseByIdUrl, ({ params }) => {
  const body = {
    title: "Course not found",
    detail: `No course exists with ID ${params.courseId}.`,
    code: "COURSE_NOT_FOUND",
  } satisfies CourseNotFoundResponse;

  return problemResponse(404, body);
});

export const courseByIdInvalidId = http.get(courseByIdUrl, ({ params }) => {
  const body = {
    title: "Invalid course ID",
    detail: `'${params.courseId}' is not a valid course identifier.`,
    code: "INVALID_COURSE_ID",
  } satisfies InvalidCourseIdResponse;

  return problemResponse(400, body);
});

export const courseByIdError = http.get(courseByIdUrl, () => {
  const body = {
    title: "Internal server error",
    detail: "We couldn't load this course right now. Please try again later.",
    code: "INTERNAL_SERVER_ERROR",
  } satisfies InternalServerErrorResponse;

  return problemResponse(500, body);
});

export const courseByIdSlow = http.get(courseByIdUrl, async () => {
  await delay(1000);
  return HttpResponse.json(courseResponse);
});

export const getCourseHandlers = {
  success: courseByIdSuccess,
  notFound: courseByIdNotFound,
  invalidId: courseByIdInvalidId,
  error: courseByIdError,
  slow: courseByIdSlow,
};
