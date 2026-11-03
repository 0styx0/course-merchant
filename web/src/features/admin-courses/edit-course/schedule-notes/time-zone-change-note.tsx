import { useWatch } from "react-hook-form";

import type { CourseFormApi } from "../../course-form/fields/course-form-fields";
import { isKnownTimeZone } from "../../validation/course-form-schema";
import type { EditCourseFormValues } from "../../validation/edit-course-form-schema";
import type { ScheduleProgress } from "../edit-form-prefill";

type TimeZoneChangeNoteProps = {
  form: CourseFormApi<EditCourseFormValues>;
  loadedTimeZone: string;
  scheduleProgress: ScheduleProgress;
};

const alreadyRanSentence =
  "Because it has started or ended, the moved times must be in the future.";

/** Tells the admin that a chosen zone other than the loaded one moves the course's moment. Spans both columns of the schedule grid. */
export function TimeZoneChangeNote({
  form,
  loadedTimeZone,
  scheduleProgress,
}: TimeZoneChangeNoteProps) {
  const chosenZone = useWatch({
    control: form.control,
    name: "schedule.timeZone",
  });
  if (!isKnownTimeZone(chosenZone) || chosenZone === loadedTimeZone)
    return null;
  const moveSentence = `The dates and times stay as typed, so the course moves to that time in ${chosenZone}.`;
  return (
    <p className="text-sm sm:col-span-2">
      {scheduleProgress === "notStarted"
        ? moveSentence
        : `${moveSentence} ${alreadyRanSentence}`}
    </p>
  );
}
