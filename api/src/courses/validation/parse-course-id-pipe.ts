import { ErrorCodeCourse } from "@/common/errors/error-codes.js";
import { ParseGuidPipe } from "@/common/validation/parse-guid.pipe.js";

export const parseCourseIdPipe = new ParseGuidPipe(
  ErrorCodeCourse.INVALID_COURSE_ID,
  "course",
);
