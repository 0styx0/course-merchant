import { components } from "src/generated/api.js";

export type CourseResponse =
  components["schemas"]["Course"];

export type ListCoursesResponse =
  components["schemas"]["ListCoursesResponse"];

export type GetCourseResponse = components["schemas"]["GetCourseResponse"]

export type errorResponse = components["schemas"]["ErrorResponse"]