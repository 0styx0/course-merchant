import "server-only";

import type {
  AdminCourse,
  CreateCourseRequest,
  ProblemDetails,
  Result,
} from "@/lib/types";
import { api } from "@/lib/api/client";
import { toResult } from "@/lib/api/to-result";

export type CreateCourseResult = Result<AdminCourse, ProblemDetails>;

export async function createCourse(
  request: CreateCourseRequest,
): Promise<CreateCourseResult> {
  return toResult(await api.POST("/admin/courses", { body: request }));
}
