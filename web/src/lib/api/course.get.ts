import "server-only";

import { cache } from "react";
import { Course, Result, ProblemDetails } from "../types";
import { api } from "./client";
import { toResult } from "./to-result";

export type GetCourseResult = Result<Course, ProblemDetails>;

/**
 * Cached per render, so a page and its `generateMetadata` share one API call.
 */
export const getCourse = cache(
  async (courseId: string): Promise<GetCourseResult> =>
    toResult(
      await api.GET("/courses/{courseId}", {
        params: {
          path: { courseId },
        },
      }),
    ),
);
