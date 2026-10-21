import { ApiException } from "../common/errors/api.exception.js";
import { ErrorCodeCourseGet } from "../common/errors/error-codes.js";

export function courseNotFound(courseId: string): ApiException {
  return new ApiException(ErrorCodeCourseGet.COURSE_NOT_FOUND, {
    detail: `No course exists with ID ${courseId}.`,
  });
}
