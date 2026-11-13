import { describe, expect, it, vi } from "vitest";

import { AdminEnrollmentsController } from "@/admin-enrollments/admin-enrollments.controller.js";
import {
  AdminEnrollmentsService,
  type UnenrollOutcome,
} from "@/admin-enrollments/admin-enrollments.service.js";
import { ApiException } from "@/common/errors/api.exception.js";
import { ErrorCode } from "@/common/errors/error-codes.js";
import { asDependency, type MockMethods } from "@/test/test-helpers.js";

const courseId = "8b0e1f5c-0000-4000-8000-000000000001";
const customerId = "8b0e1f5c-0000-4000-8000-000000000002";

function makeController(outcome: UnenrollOutcome) {
  const service: MockMethods<AdminEnrollmentsService, "unenroll"> = {
    unenroll: vi
      .fn<AdminEnrollmentsService["unenroll"]>()
      .mockResolvedValue(outcome),
  };

  return {
    service,
    controller: new AdminEnrollmentsController(asDependency(service)),
  };
}

describe("AdminEnrollmentsController", () => {
  it.each<UnenrollOutcome>(["unenrolled", "already_unenrolled"])(
    "resolves with nothing when the outcome is %s",
    async (outcome) => {
      const { controller, service } = makeController(outcome);

      await expect(
        controller.unenrollStudent(courseId, customerId),
      ).resolves.toBeUndefined();
      expect(service.unenroll).toHaveBeenCalledWith(courseId, customerId);
    },
  );

  it("throws ENROLLMENT_NOT_FOUND naming both ids when no enrollment exists", async () => {
    const { controller } = makeController("not_found");

    const thrown = await controller
      .unenrollStudent(courseId, customerId)
      .catch((error: unknown) => error);

    expect(thrown).toBeInstanceOf(ApiException);
    expect(thrown).toMatchObject({
      code: ErrorCode.ENROLLMENT_NOT_FOUND,
      detail: `No enrollment exists for customer ${customerId} in course ${courseId}.`,
    });
  });
});
