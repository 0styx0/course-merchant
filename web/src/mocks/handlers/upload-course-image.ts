import type { operations } from "@/lib/api/generated";
import { http, HttpResponse } from "msw";
import { MOCK_API_BASE_URL } from "../mock-api";
import { problemResponse } from "../problem-response";

type ValidationFailedResponse =
  operations["uploadCourseImage"]["responses"][400]["content"]["application/problem+json"];

type InternalServerErrorResponse =
  operations["uploadCourseImage"]["responses"][500]["content"]["application/problem+json"];

export const uploadCourseImageUrl = `${MOCK_API_BASE_URL}/v1/admin/courses/:courseId/image`;

export const uploadCourseImageSuccess = http.put(uploadCourseImageUrl, () => {
  return new HttpResponse(null, { status: 204 });
});

export const uploadCourseImageValidationFailed = http.put(
  uploadCourseImageUrl,
  () => {
    const body = {
      title: "Validation failed",
      detail: "The request contains 1 invalid field.",
      code: "VALIDATION_FAILED",
      errors: [
        {
          field: "/image",
          code: "INVALID_FORMAT",
          detail: "The image must be a JPEG, PNG or WebP file.",
        },
      ],
    } satisfies ValidationFailedResponse;

    return problemResponse(400, body);
  },
);

export const uploadCourseImageError = http.put(uploadCourseImageUrl, () => {
  const body = {
    title: "Internal server error",
    detail: "We couldn't save this image right now. Please try again later.",
    code: "INTERNAL_SERVER_ERROR",
  } satisfies InternalServerErrorResponse;

  return problemResponse(500, body);
});

export const uploadCourseImageHandlers = {
  success: uploadCourseImageSuccess,
  validationFailed: uploadCourseImageValidationFailed,
  error: uploadCourseImageError,
};
