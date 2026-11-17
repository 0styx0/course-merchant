import type { operations } from "@/lib/api/generated";
import { http, HttpResponse } from "msw";
import { MOCK_API_BASE_URL } from "../../mock-api";
import { problemResponse } from "../../problem-response";

type EnrollmentNotFoundResponse =
  operations["revokeEnrollment"]["responses"][404]["content"]["application/problem+json"];

type InternalServerErrorResponse =
  operations["revokeEnrollment"]["responses"][500]["content"]["application/problem+json"];

export const revokeEnrollmentUrl = `${MOCK_API_BASE_URL}/v1/admin/courses/:courseId/enrollments/:customerId/revocation`;

export const revokeEnrollmentSuccess = http.post(revokeEnrollmentUrl, () => {
  return new HttpResponse(null, { status: 204 });
});

export const revokeEnrollmentNotFound = http.post(
  revokeEnrollmentUrl,
  ({ params }) => {
    const body = {
      title: "Enrollment not found",
      detail: `No enrollment exists for customer ${params.customerId} in course ${params.courseId}.`,
      code: "ENROLLMENT_NOT_FOUND",
    } satisfies EnrollmentNotFoundResponse;

    return problemResponse(404, body);
  },
);

const revokeEnrollmentError = http.post(revokeEnrollmentUrl, () => {
  const body = {
    title: "Internal server error",
    detail:
      "We couldn't un-enroll this student right now. Please try again later.",
    code: "INTERNAL_SERVER_ERROR",
  } satisfies InternalServerErrorResponse;

  return problemResponse(500, body);
});

export const revokeEnrollmentHandlers = {
  success: revokeEnrollmentSuccess,
  notFound: revokeEnrollmentNotFound,
  error: revokeEnrollmentError,
};
