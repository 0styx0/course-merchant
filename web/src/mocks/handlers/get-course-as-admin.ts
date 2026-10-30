import type { operations } from "@/lib/api/generated";
import { http, HttpResponse } from "msw";
import { draftedAdminCourse } from "../fixtures/admin-courses";
import { MOCK_API_BASE_URL } from "../mock-api";
import { problemResponse } from "../problem-response";

type InvalidCourseIdResponse =
  operations["getCourseAsAdmin"]["responses"][400]["content"]["application/problem+json"];

type CourseNotFoundResponse =
  operations["getCourseAsAdmin"]["responses"][404]["content"]["application/problem+json"];

type InternalServerErrorResponse =
  operations["getCourseAsAdmin"]["responses"][500]["content"]["application/problem+json"];

const adminCourseByIdUrl = `${MOCK_API_BASE_URL}/v1/admin/courses/:courseId`;

const adminCourseByIdSuccess = http.get(adminCourseByIdUrl, () => {
  return HttpResponse.json(draftedAdminCourse);
});

const adminCourseByIdNotFound = http.get(adminCourseByIdUrl, ({ params }) => {
  const body = {
    title: "Course not found",
    detail: `No course exists with ID ${params.courseId}.`,
    code: "COURSE_NOT_FOUND",
  } satisfies CourseNotFoundResponse;

  return problemResponse(404, body);
});

const adminCourseByIdInvalidId = http.get(adminCourseByIdUrl, ({ params }) => {
  const body = {
    title: "Invalid course ID",
    detail: `'${params.courseId}' is not a valid course identifier.`,
    code: "INVALID_COURSE_ID",
  } satisfies InvalidCourseIdResponse;

  return problemResponse(400, body);
});

const adminCourseByIdError = http.get(adminCourseByIdUrl, () => {
  const body = {
    title: "Internal server error",
    detail: "We couldn't load this course right now. Please try again later.",
    code: "INTERNAL_SERVER_ERROR",
  } satisfies InternalServerErrorResponse;

  return problemResponse(500, body);
});

export const getCourseAsAdminHandlers = {
  success: adminCourseByIdSuccess,
  notFound: adminCourseByIdNotFound,
  invalidId: adminCourseByIdInvalidId,
  error: adminCourseByIdError,
};
