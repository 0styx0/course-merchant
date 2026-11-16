import { describe, expect, it, vi } from "vitest";

import { adminCourseWithFuturePrice } from "@/mocks/fixtures/admin-courses";
import { getCourseAsAdminHandlers } from "@/mocks/handlers/admin-courses/get-course-as-admin";
import { server } from "@/mocks/server";
import { getAdminCourseOrNotFound } from "./get-admin-course-or-not-found";

// Its default export throws outside a React Server Component build
vi.mock("server-only", () => ({}));

const NOT_FOUND_DIGEST = "NEXT_HTTP_ERROR_FALLBACK;404";
const courseId = adminCourseWithFuturePrice.id;

describe("getAdminCourseOrNotFound", () => {
  it("gives the course the API answers with", async () => {
    server.use(getCourseAsAdminHandlers.success);

    expect(await getAdminCourseOrNotFound(courseId)).toEqual({
      state: "success",
      data: adminCourseWithFuturePrice,
    });
  });

  it.each(["notFound", "invalidId"] as const)(
    "shows the 404 page for the %s answer",
    async (scenario) => {
      server.use(getCourseAsAdminHandlers[scenario]);

      await expect(getAdminCourseOrNotFound(courseId)).rejects.toMatchObject({
        digest: NOT_FOUND_DIGEST,
      });
    },
  );

  it("gives any other problem back for the page to show", async () => {
    server.use(getCourseAsAdminHandlers.error);

    expect(await getAdminCourseOrNotFound(courseId)).toMatchObject({
      state: "failure",
      error: { code: "INTERNAL_SERVER_ERROR" },
    });
  });
});
