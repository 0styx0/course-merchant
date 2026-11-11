import type { Course } from "@/lib/types";

export type CourseStage = "upcoming" | "in-progress" | "ended";

/** Where a course stands at `now`; a course ends the moment its end time arrives, as the API's 409 rule does. */
export function getCourseStage(
  schedule: Course["schedule"],
  now: Date,
): CourseStage {
  if (now.getTime() < Date.parse(schedule.startTime)) return "upcoming";
  if (now.getTime() < Date.parse(schedule.endTime)) return "in-progress";
  return "ended";
}
