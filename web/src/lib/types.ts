import { components, operations } from "./api/generated";

export type Result<T, E> =
  | {
      state: "success";
      data: T;
    }
  | {
      state: "failure";
      error: E;
    };

export type Course = components["schemas"]["Course"];
export type ProblemDetails = components["schemas"]["ProblemDetails"];
export type CoursesResponse =
  operations["listCourses"]["responses"][200]["content"]["application/json"];
