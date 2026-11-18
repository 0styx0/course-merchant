import type { operations } from "@/lib/api/generated";
import { http, HttpResponse } from "msw";
import { adminCustomers } from "../../fixtures/admin-students";
import { MOCK_API_BASE_URL } from "../../mock-api";
import { problemResponse } from "../../problem-response";

type InternalServerErrorResponse =
  operations["listCustomersAsAdmin"]["responses"][500]["content"]["application/problem+json"];

const adminCustomersUrl = `${MOCK_API_BASE_URL}/v1/admin/customers`;

const adminCustomersSuccess = http.get(adminCustomersUrl, () =>
  HttpResponse.json({ customers: adminCustomers }),
);

const adminCustomersEmpty = http.get(adminCustomersUrl, () =>
  HttpResponse.json({ customers: [] }),
);

const adminCustomersError = http.get(adminCustomersUrl, () => {
  const body = {
    title: "Internal server error",
    detail: "We couldn't load the students right now. Please try again later.",
    code: "INTERNAL_SERVER_ERROR",
  } satisfies InternalServerErrorResponse;

  return problemResponse(500, body);
});

export const listCustomersAsAdminHandlers = {
  success: adminCustomersSuccess,
  empty: adminCustomersEmpty,
  error: adminCustomersError,
};
