import type { operations } from "@/lib/api/generated";
import { http, HttpResponse, delay } from "msw";

type CoursesResponse =
  operations["listCourses"]["responses"][200]["content"]["application/json"];

const apiBaseUrl =
  process.env.API_BASE_URL ?? "http://localhost:3001";

export const coursesUrl = `${apiBaseUrl}/v1/courses`;

export const coursesResponse = {
  courses: [
    {
      name: "React Fundamentals",
      description: "Learn React",
      enrollmentCount: 12,
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
      name: "Advanced TypeScript",
      description: "Build robust applications with TypeScript",
      enrollmentCount: 37,
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
  return HttpResponse.json(
    {
      message: "Internal server error",
    },
    { status: 500 }
  );
});

export const coursesSlow = http.get(coursesUrl, async () => {
  await delay(1000);

  return HttpResponse.json(coursesResponse);
});


export const coursesHandlers = {
  success: coursesSuccess,
  empty: coursesEmpty,
  error: coursesError,
  slow: coursesSlow,
};
