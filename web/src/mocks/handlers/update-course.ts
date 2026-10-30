import type { operations } from "@/lib/api/generated";
import { http, HttpResponse } from "msw";
import { draftedAdminCourse } from "../fixtures/admin-courses";
import { MOCK_API_BASE_URL } from "../mock-api";
import { problemResponse } from "../problem-response";

type ValidationFailedResponse =
  operations["updateCourse"]["responses"][400]["content"]["application/problem+json"];

type InternalServerErrorResponse =
  operations["updateCourse"]["responses"][500]["content"]["application/problem+json"];

export const updateCourseUrl = `${MOCK_API_BASE_URL}/v1/admin/courses/:courseId`;

export const updateCourseSuccess = http.put(updateCourseUrl, () => {
  return HttpResponse.json(draftedAdminCourse);
});

export const updateCourseValidationFailed = http.put(updateCourseUrl, () => {
  const body = {
    title: "Validation failed",
    detail: "The request contains 1 invalid field.",
    code: "VALIDATION_FAILED",
    errors: [
      {
        field: "/schedule/endTime",
        code: "INVALID_RANGE",
        detail: "End time must be after start time.",
      },
    ],
  } satisfies ValidationFailedResponse;

  return problemResponse(400, body);
});

export const updateCourseError = http.put(updateCourseUrl, () => {
  const body = {
    title: "Internal server error",
    detail: "We couldn't save this course right now. Please try again later.",
    code: "INTERNAL_SERVER_ERROR",
  } satisfies InternalServerErrorResponse;

  return problemResponse(500, body);
});

export const updateCourseHandlers = {
  success: updateCourseSuccess,
  validationFailed: updateCourseValidationFailed,
  error: updateCourseError,
};
