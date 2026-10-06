import { delay } from "msw/utils/delay";
import { http, HttpResponse } from "msw/http";
import type { operations } from "@/lib/api/generated";
import { SetupServer } from "msw/node";

type CoursesResponse =
  operations["listCourses"]["responses"][200]["content"]["application/json"];

const apiBaseUrl =
  process.env.API_BASE_URL ?? "http://localhost:3000";

const coursesUrl = `${apiBaseUrl}/v1/courses`;

const coursesResponse = {
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
} satisfies CoursesResponse;

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

// allow changing mock responses via dedicated endpoint.
//  used for e2e, where browser can't directly communicate with msw
export const coursesMockControl = (server: SetupServer) => http.get(
  `${apiBaseUrl}/__mocks__/courses`,
  ({ request }) => {
    const state = new URL(request.url).searchParams.get("state");

    if (state === null || !Object.hasOwn(coursesHandlers, state)) {
      return HttpResponse.json(
        { message: "Invalid mock state" },
        { status: 400 },
      );
    }

    server.use(coursesHandlers[state as keyof typeof coursesHandlers]);

    return HttpResponse.json({ state });
  },
);
