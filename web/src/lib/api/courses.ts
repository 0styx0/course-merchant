import "server-only";

import type { operations } from "./generated";
import { api } from "./client";
import { Result } from "../types";

type CoursesResponse =
  operations["listCourses"]["responses"][200]["content"]["application/json"];

export type Course = CoursesResponse["courses"][number];

export type GetCoursesResult = Result<
  CoursesResponse,
  string
>;

export async function getCourses(): Promise<GetCoursesResult> {

  const { data, error } = await api.GET("/courses");

  if (error || !data) {
    return {
      state: "failure",
      error: error.code
    };
  }

  return {
    state: "success",
    data,
  };
}
