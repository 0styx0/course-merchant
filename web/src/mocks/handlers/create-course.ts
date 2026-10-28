import type { operations } from "@/lib/api/generated";
import { http, HttpResponse } from "msw";
import { draftedAdminCourse } from "../fixtures/admin-courses";
import { MOCK_API_BASE_URL } from "../mock-api";
import { problemResponse } from "../problem-response";

type ValidationFailedResponse =
  operations["createCourse"]["responses"][400]["content"]["application/problem+json"];

type InternalServerErrorResponse =
  operations["createCourse"]["responses"][500]["content"]["application/problem+json"];

export const createCourseUrl = `${MOCK_API_BASE_URL}/v1/admin/courses`;

export const createCourseSuccess = http.post(createCourseUrl, () => {
  return HttpResponse.json(draftedAdminCourse, { status: 201 });
});

export const createCourseValidationFailed = http.post(createCourseUrl, () => {
  const body = {
    title: "Validation failed",
    detail: "The request contains 2 invalid fields.",
    code: "VALIDATION_FAILED",
    errors: [
      {
        field: "/prices/0/amount",
        code: "BELOW_MINIMUM",
        detail: "Price must either be free or cost at least 0.50.",
      },
      {
        field: "/schedule/endTime",
        code: "INVALID_RANGE",
        detail: "End time must be after start time.",
      },
    ],
  } satisfies ValidationFailedResponse;

  return problemResponse(400, body);
});

export const createCourseError = http.post(createCourseUrl, () => {
  const body = {
    title: "Internal server error",
    detail: "We couldn't save this course right now. Please try again later.",
    code: "INTERNAL_SERVER_ERROR",
  } satisfies InternalServerErrorResponse;

  return problemResponse(500, body);
});

export const createCourseHandlers = {
  success: createCourseSuccess,
  validationFailed: createCourseValidationFailed,
  error: createCourseError,
};
