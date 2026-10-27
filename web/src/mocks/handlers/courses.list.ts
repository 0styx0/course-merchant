import type { operations } from "@/lib/api/generated";
import type { CoursesResponse } from "@/lib/types";
import { randomUUID } from "crypto";
import { http, HttpResponse, delay } from "msw";
import { MOCK_API_BASE_URL } from "../mock-api";

type InternalServerError =
  operations["listCourses"]["responses"][500]["content"]["application/problem+json"];

const coursesUrl = `${MOCK_API_BASE_URL}/v1/courses`;

export const coursesResponse = {
  courses: [
    {
      id: randomUUID(),
      name: "React Fundamentals",
      summary: "Learn React",
      description: "Learn React",
      enrollmentCount: 12,
      image: { version: "1790856000000" },
      price: {
        amount: 9900,
        currency: "USD",
      },
      schedule: {
        startTime: "2026-10-01T14:00:00-04:00",
        endTime: "2026-10-01T16:00:00-04:00",
        timeZone: "America/New_York",
      },
    },
    {
      id: randomUUID(),
      name: "Advanced TypeScript",
      summary: "Build robust applications with TypeScript",
      description: "Build robust applications with TypeScript",
      enrollmentCount: 37,
      image: { version: "1790856000000" },
      price: {
        amount: 14900,
        currency: "USD",
      },
      schedule: {
        startTime: "2026-10-02T18:00:00-04:00",
        endTime: "2026-10-02T20:00:00-04:00",
        timeZone: "America/New_York",
      },
    },
  ],
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

  return new HttpResponse(JSON.stringify(body), {
    status: 500,
    headers: {
      "Content-Type": "application/problem+json",
    },
  });
});

export const coursesSlow = http.get(coursesUrl, async () => {
  await delay(1000);

  return HttpResponse.json(coursesResponse);
});

export const courseListHandlers = {
  success: coursesSuccess,
  empty: coursesEmpty,
  error: coursesError,
  slow: coursesSlow,
};
