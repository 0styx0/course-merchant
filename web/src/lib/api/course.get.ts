import { Course, Result, ProblemDetails } from "../types";
import { api } from "./client";
import { toResult } from "./to-result";

export type GetCourseResult = Result<Course, ProblemDetails>;

export async function getCourse(courseId: string): Promise<GetCourseResult> {
  return toResult(
    await api.GET("/courses/{courseId}", {
      params: {
        path: { courseId },
      },
    }),
  );
}
