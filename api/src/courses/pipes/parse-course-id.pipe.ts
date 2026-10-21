import { ApiException } from "@/common/errors/api.exception.js";
import { ErrorCode } from "@/common/errors/error-codes.js";
import { Injectable, PipeTransform } from "@nestjs/common";
import { z } from "zod";

// any 8-4-4-4-12 hex id, which is what postgres accepts for a uuid column
const courseIdSchema = z.guid();

@Injectable()
export class ParseCourseIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (courseIdSchema.safeParse(value).success) {
      return value;
    }

    throw new ApiException(ErrorCode.INVALID_COURSE_ID, {
      detail: `'${value}' is not a valid course identifier.`,
    });
  }
}
