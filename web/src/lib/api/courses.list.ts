import "server-only";

import type { CoursesResponse } from "../types";
import { api } from "./client";

/**
 * Throws instead of returning a failure: the home page is regenerated in the
 * background, and a throw makes Next keep serving the last good copy.
 */
export async function getCourses(): Promise<CoursesResponse> {
  const { data, error, response } = await api.GET("/courses");

  if (error || !data) {
    throw new Error(
      `listCourses failed with status ${response.status} (${error?.code ?? "no problem code"})`,
    );
  }

  return data;
}
