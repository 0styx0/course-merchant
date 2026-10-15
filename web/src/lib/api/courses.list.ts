import "server-only";

import type { operations } from "./generated";
import { api } from "./client";
import { ProblemDetails, Result } from "../types";

type CoursesResponse =
  operations["listCourses"]["responses"][200]["content"]["application/json"];

export type GetCoursesResult = Result<
  CoursesResponse,
  ProblemDetails
>;

export async function getCourses(): Promise<GetCoursesResult> {

  const { data, error } = await api.GET("/courses");

  if (error || !data) {
    return {
      state: "failure",
      error
    };
  }

  return {
    state: "success",
    data,
  };
}
