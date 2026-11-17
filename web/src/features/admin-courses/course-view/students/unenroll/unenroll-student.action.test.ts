import { http } from "msw";
import { refresh } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  revokeEnrollmentNotFound,
  revokeEnrollmentSuccess,
  revokeEnrollmentUrl,
} from "@/mocks/handlers/admin-courses/revoke-enrollment";
import { problemResponse } from "@/mocks/problem-response";
import { server } from "@/mocks/server";

import { unenrollStudentAction } from "./unenroll-student.action";

// Its default export throws outside a React Server Component build
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ refresh: vi.fn() }));

const courseId = "123e4567-e89b-12d3-a456-426614174000";
const customerId = "7c9e6679-7425-40de-944b-e07fc1f90ae7";

const invalidIdsFailure = {
  state: "failure",
  error: {
    title: "Validation failed",
    detail: "The course or student id is not valid.",
    code: "VALIDATION_FAILED",
  },
};

function captureRequests() {
  const sent = { urls: [] as string[] };
  server.use(
    http.post(revokeEnrollmentUrl, ({ request }) => {
      sent.urls.push(new URL(request.url).pathname);
      return new Response(null, { status: 204 });
    }),
  );
  return sent;
}

describe("unenrollStudentAction", () => {
  beforeEach(() => {
    vi.mocked(refresh).mockClear();
    server.use(revokeEnrollmentSuccess);
  });

  it("posts to the revocation address with both ids, refreshes once and succeeds", async () => {
    const sent = captureRequests();

    await expect(unenrollStudentAction(courseId, customerId)).resolves.toEqual({
      state: "success",
      data: null,
    });

    expect(sent.urls).toEqual([
      `/v1/admin/courses/${courseId}/enrollments/${customerId}/revocation`,
    ]);
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("succeeds again when the API repeats its 204", async () => {
    const sent = captureRequests();
    await unenrollStudentAction(courseId, customerId);

    await expect(unenrollStudentAction(courseId, customerId)).resolves.toEqual({
      state: "success",
      data: null,
    });
    expect(sent.urls).toHaveLength(2);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("returns the API's title and detail for an unknown enrollment, without a refresh", async () => {
    server.use(revokeEnrollmentNotFound);

    await expect(unenrollStudentAction(courseId, customerId)).resolves.toEqual({
      state: "failure",
      error: {
        title: "Enrollment not found",
        detail: `No enrollment exists for customer ${customerId} in course ${courseId}.`,
        code: "ENROLLMENT_NOT_FOUND",
      },
    });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("returns the API's title and detail for a server error, without a refresh", async () => {
    // Words found nowhere in the app, so only a pass-through can return them.
    const serverProblem = {
      title: "Server error seen only in this test",
      detail: "Detail seen only in this test.",
      code: "INTERNAL_SERVER_ERROR",
    };
    server.use(
      http.post(revokeEnrollmentUrl, () => problemResponse(500, serverProblem)),
    );

    await expect(unenrollStudentAction(courseId, customerId)).resolves.toEqual({
      state: "failure",
      error: serverProblem,
    });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("refuses a malformed course id without a request or a refresh", async () => {
    const sent = captureRequests();

    await expect(
      unenrollStudentAction("not-a-uuid", customerId),
    ).resolves.toEqual(invalidIdsFailure);

    expect(sent.urls).toEqual([]);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("refuses a malformed customer id without a request or a refresh", async () => {
    const sent = captureRequests();

    await expect(
      unenrollStudentAction(courseId, "not-a-uuid"),
    ).resolves.toEqual(invalidIdsFailure);

    expect(sent.urls).toEqual([]);
    expect(refresh).not.toHaveBeenCalled();
  });
});
