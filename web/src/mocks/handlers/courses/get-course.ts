import type { operations } from "@/lib/api/generated";
import { delay, http, HttpResponse } from "msw";
import { MOCK_API_BASE_URL } from "../../mock-api";
import {
  endedCourse,
  endedLongCourse,
  publicCourses,
  reactCourse,
} from "../../fixtures/courses";
import { problemResponse } from "../../problem-response";

type GetCourseResponse =
  operations["getCourse"]["responses"][200]["content"]["application/json"];

type InvalidCourseIdResponse =
  operations["getCourse"]["responses"][400]["content"]["application/problem+json"];

type CourseNotFoundResponse =
  operations["getCourse"]["responses"][404]["content"]["application/problem+json"];

type InternalServerErrorResponse =
  operations["getCourse"]["responses"][500]["content"]["application/problem+json"];

const courseByIdUrl = `${MOCK_API_BASE_URL}/v1/courses/:courseId`;

function respondWithCourse(courseId: string | readonly string[]) {
  // The API's list leaves ended courses out, but its course endpoint serves them.
  const course: GetCourseResponse | undefined = [
    ...publicCourses,
    endedCourse,
    endedLongCourse,
  ].find((publicCourse) => publicCourse.id === courseId);

  return course ? HttpResponse.json(course) : respondCourseNotFound(courseId);
}

function respondCourseNotFound(courseId: string | readonly string[]) {
  const body = {
    title: "Course not found",
    detail: `No course exists with ID ${courseId}.`,
    code: "COURSE_NOT_FOUND",
  } satisfies CourseNotFoundResponse;

  return problemResponse(404, body);
}

export const courseByIdSuccess = http.get(courseByIdUrl, ({ params }) => {
  return respondWithCourse(params.courseId);
});

export const courseByIdNotFound = http.get(courseByIdUrl, ({ params }) => {
  return respondCourseNotFound(params.courseId);
});

export const courseByIdInvalidId = http.get(courseByIdUrl, ({ params }) => {
  const body = {
    title: "Invalid course ID",
    detail: `'${params.courseId}' is not a valid course identifier.`,
    code: "INVALID_COURSE_ID",
  } satisfies InvalidCourseIdResponse;

  return problemResponse(400, body);
});

export const courseByIdError = http.get(courseByIdUrl, () => {
  const body = {
    title: "Internal server error",
    detail: "We couldn't load this course right now. Please try again later.",
    code: "INTERNAL_SERVER_ERROR",
  } satisfies InternalServerErrorResponse;

  return problemResponse(500, body);
});

const courseByIdSlow = http.get(courseByIdUrl, async ({ params }) => {
  await delay(1000);
  return respondWithCourse(params.courseId);
});

const FOUR_DAYS_IN_MILLISECONDS = 4 * 24 * 60 * 60 * 1000;

// The only handler with times relative to now, so `dev:mock` can walk "Starts in 4 days" (set `scenario = "startsSoon"` in `src/mocks/server.ts`).
const courseByIdStartsSoon = http.get(courseByIdUrl, () => {
  const startTime = Date.now() + FOUR_DAYS_IN_MILLISECONDS;
  const courseLength =
    Date.parse(reactCourse.schedule.endTime) -
    Date.parse(reactCourse.schedule.startTime);
  const course: GetCourseResponse = {
    ...reactCourse,
    schedule: {
      ...reactCourse.schedule,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(startTime + courseLength).toISOString(),
    },
  };

  return HttpResponse.json(course);
});

export const getCourseHandlers = {
  success: courseByIdSuccess,
  notFound: courseByIdNotFound,
  invalidId: courseByIdInvalidId,
  error: courseByIdError,
  slow: courseByIdSlow,
  startsSoon: courseByIdStartsSoon,
};
