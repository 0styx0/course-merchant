import { FROZEN_NOW } from "@/test/frozen-now";
import type { JSONContent } from "@tiptap/core";

import { courseFormSchema, type CourseFormValues } from "../course-form-schema";

export const paragraph = (value: string): JSONContent => ({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text: value }] }],
});

export function validValues(): CourseFormValues {
  return {
    name: "React Fundamentals",
    summary: "Learn React.",
    description: paragraph("A long description."),
    contentUrl: "https://drive.google.com/drive/folders/abc",
    schedule: {
      startDate: "2027-07-01",
      startTimeOfDay: "09:00",
      endDate: "2027-07-01",
      endTimeOfDay: "11:00",
      timeZone: "America/New_York",
    },
    prices: [
      { amountDollars: "79.50", effectiveDate: "", effectiveTimeOfDay: "" },
    ],
  };
}

/** Messages by field path, e.g. `schedule.endTimeOfDay`. */
export function problems(values: CourseFormValues): Record<string, string[]> {
  const result = courseFormSchema.safeParse(values);
  const byPath: Record<string, string[]> = {};
  if (result.success) return byPath;
  for (const issue of result.error.issues) {
    const path = issue.path.join(".");
    (byPath[path] ??= []).push(issue.message);
  }
  return byPath;
}

export function withValues(change: (values: CourseFormValues) => void) {
  const values = validValues();
  change(values);
  return problems(values);
}

/** The wall-clock text, in the fixtures' zone, of the moment `offsetMilliseconds` after `FROZEN_NOW`. */
export const newYorkWallClockAt = (offsetMilliseconds: number) =>
  new Date(FROZEN_NOW + offsetMilliseconds)
    .toLocaleString("sv-SE", { timeZone: "America/New_York" })
    .slice(0, 16)
    .replace(" ", "T");
