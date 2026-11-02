import { http, HttpResponse } from "msw";

import { draftedAdminCourse } from "@/mocks/fixtures/admin-courses";
import { updateCourseUrl } from "@/mocks/handlers/update-course";
import { server } from "@/mocks/node";

import type { FieldsSentBackUnchanged } from "../../edit-course/edit-form-prefill";
import type {
  EditCourseFormValues,
  LoadedSchedule,
} from "../../validation/edit-course-form-schema";

export const courseId = draftedAdminCourse.id;

export const validValues: EditCourseFormValues = {
  name: "React Fundamentals",
  summary: "Learn React.",
  description: {
    type: "doc",
    content: [
      { type: "paragraph", content: [{ type: "text", text: "Hi" }] },
      { type: "paragraph" },
    ],
  },
  contentUrl: "https://example.com/course",
  schedule: {
    timeZone: "America/New_York",
    startDate: "2020-01-01",
    startTimeOfDay: "09:00",
    endDate: "2020-01-01",
    endTimeOfDay: "17:00",
  },
};

export const loadedSchedule: LoadedSchedule = {
  startTime: "2020-01-01T14:00:00Z",
  endTime: "2020-01-01T22:00:00Z",
};

export const fieldsSentBackUnchanged: FieldsSentBackUnchanged = {
  status: "published",
  prices: [
    { amount: 9900, currency: "USD", effectiveAt: "2019-12-01T00:00:00Z" },
  ],
};

export function captureBody() {
  const sent: { id?: unknown; body?: unknown; calls: number } = { calls: 0 };
  server.use(
    http.put(updateCourseUrl, async ({ request, params }) => {
      sent.calls += 1;
      sent.id = params.courseId;
      sent.body = await request.json();
      return HttpResponse.json(draftedAdminCourse);
    }),
  );
  return sent;
}
