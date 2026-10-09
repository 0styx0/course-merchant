import { ApiException } from "@/common/errors/api.exception.js";
import { ErrorCode } from "@/common/errors/error-codes.js";
import { Injectable, ParseUUIDPipe } from "@nestjs/common";

@Injectable()
export class ParseCourseIdPipe extends ParseUUIDPipe {
  constructor() {
    super({
      exceptionFactory: () =>
        new ApiException(ErrorCode.INVALID_COURSE_ID),
    });
  }
}