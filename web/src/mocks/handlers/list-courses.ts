import type { operations } from "@/lib/api/generated";
import type { CoursesResponse } from "@/lib/types";
import { http, HttpResponse, delay } from "msw";
import { reactCourse, typescriptCourse } from "../fixtures/courses";
import { MOCK_API_BASE_URL } from "../mock-api";
import { problemResponse } from "../problem-response";

type InternalServerError =
  operations["listCourses"]["responses"][500]["content"]["application/problem+json"];

const coursesUrl = `${MOCK_API_BASE_URL}/v1/courses`;

const coursesResponse = {
  courses: [reactCourse, typescriptCourse],
} as const satisfies CoursesResponse;

export const coursesSuccess = http.get(coursesUrl, () => {
  return HttpResponse.json(coursesResponse);
});

export const coursesEmpty = http.get(coursesUrl, () => {
  return HttpResponse.json({
    courses: [],
  } satisfies CoursesResponse);
});

export const coursesError = http.get(coursesUrl, () => {
  const body = {
    title: "Internal server error",
    detail: "Unable to load courses. Please reload the page.",
    code: "INTERNAL_SERVER_ERROR",
  } satisfies InternalServerError;

  return problemResponse(500, body);
});

export const coursesSlow = http.get(coursesUrl, async () => {
  await delay(1000);

  return HttpResponse.json(coursesResponse);
});

export const listCoursesHandlers = {
  success: coursesSuccess,
  empty: coursesEmpty,
  error: coursesError,
  slow: coursesSlow,
};
