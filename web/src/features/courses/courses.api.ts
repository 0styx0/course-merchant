import "server-only";

import { cache } from "react";
import type {
  Course,
  CoursesResponse,
  ProblemDetails,
  Result,
} from "@/lib/types";
import { api } from "@/lib/api/client";
import { toResult } from "@/lib/api/to-result";

export type GetCourseResult = Result<Course, ProblemDetails>;

/**
 * Throws instead of returning a failure: the home page is regenerated in the
 * background, and a throw makes Next keep serving the last good copy.
 */
export async function listCourses(): Promise<CoursesResponse> {
  const { data, error, response } = await api.GET("/courses");

  if (error || !data) {
    throw new Error(
      `listCourses failed with status ${response.status} (${error?.code ?? "no problem code"})`,
    );
  }

  return data;
}

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

export type CourseImage = { bytes: ArrayBuffer; cacheControl: string | null };

/**
 * `toResult` drops the headers, so this reads the API's `Cache-Control` from
 * the response before handing the answer to it.
 */
export async function getCourseImage(
  courseId: string,
  version: string,
): Promise<Result<CourseImage, ProblemDetails>> {
  const answer = await api.GET("/courses/{courseId}/image/{version}", {
    params: { path: { courseId, version } },
    parseAs: "arrayBuffer",
  });
  const result = toResult(answer);

  if (result.state === "failure") {
    return result;
  }
  return {
    state: "success",
    data: {
      bytes: result.data,
      cacheControl: answer.response.headers.get("Cache-Control"),
    },
  };
}
