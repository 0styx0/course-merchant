import type { ScheduleProgress } from "../edit-form-prefill";

const noteSentences: Record<Exclude<ScheduleProgress, "notStarted">, string> = {
  running:
    "This course has started. You can keep its times, but a changed time must be in the future.",
  ended:
    "This course has ended. You can keep its times, but a changed time must be in the future.",
};

/** Tells the admin a course that already started or ended may keep its times. Spans both columns of the schedule grid. */
export function ScheduleProgressNote({
  progress,
}: {
  progress: ScheduleProgress;
}) {
  if (progress === "notStarted") return null;
  return <p className="text-sm sm:col-span-2">{noteSentences[progress]}</p>;
}
