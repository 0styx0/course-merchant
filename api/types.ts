import { components } from "src/generated/api.js";

export type CourseResponse =
  components["schemas"]["Course"];

export type ListCoursesResponse =
  components["schemas"]["ListCoursesResponse"];

export type GetCourseResponse = components["schemas"]["Course"]

export type GetCourseAdminResponse = components["schemas"]["AdminCourse"]
export type ListCoursesAdminResponse = components["schemas"]["ListAdminCoursesResponse"]

export type ProblemDetails = components["schemas"]["ProblemDetails"]

export type FieldError = components["schemas"]["FieldError"]

