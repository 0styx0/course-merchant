import { Controller, HttpCode, Inject, Param, Post } from "@nestjs/common";

import { ApiException } from "@/common/errors/api.exception.js";
import { ErrorCodeEnrollment } from "@/common/errors/error-codes.js";
import { ParseGuidPipe } from "@/common/validation/parse-guid.pipe.js";
import { parseCourseIdPipe } from "@/courses/validation/parse-course-id-pipe.js";
import { AdminEnrollmentsService } from "./admin-enrollments.service.js";

const parseCustomerIdPipe = new ParseGuidPipe(
  ErrorCodeEnrollment.INVALID_CUSTOMER_ID,
  "customer",
);

@Controller({
  path: "admin/courses",
  version: "1",
})
export class AdminEnrollmentsController {
  constructor(
    @Inject(AdminEnrollmentsService)
    private readonly adminEnrollmentsService: AdminEnrollmentsService,
  ) {}

  @Post(":courseId/enrollments/:customerId/revocation")
  @HttpCode(204)
  async unenrollStudent(
    @Param("courseId", parseCourseIdPipe) courseId: string,
    @Param("customerId", parseCustomerIdPipe) customerId: string,
  ): Promise<void> {
    const outcome = await this.adminEnrollmentsService.unenroll(
      courseId,
      customerId,
    );

    if (outcome === "not_found") {
      throw new ApiException(ErrorCodeEnrollment.ENROLLMENT_NOT_FOUND, {
        detail: `No enrollment exists for customer ${customerId} in course ${courseId}.`,
      });
    }
  }
}
