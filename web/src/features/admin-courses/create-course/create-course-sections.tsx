"use client";

import {
  ScheduleDateTimeFields,
  type ScheduleDateTimeNames,
} from "../course-form/sections/course-form-schedule-fields";
import {
  TimeZoneField,
  type CourseFormApi,
} from "../course-form/sections/course-form-fields";
import { ScheduleSection } from "../course-form/sections/course-form-sections";
import { ScheduleProblems } from "../course-form/sections/schedule-problems";
import type { CourseFormWithImageValues } from "../validation/course-form-schema";

const scheduleNames: ScheduleDateTimeNames<CourseFormWithImageValues> = {
  startDate: "schedule.startDate",
  startTimeOfDay: "schedule.startTimeOfDay",
  endDate: "schedule.endDate",
  endTimeOfDay: "schedule.endTimeOfDay",
};

/** Create's schedule: the cross-field messages, the zone, and the four date and time boxes. */
export function CreateScheduleSection({
  form,
  timeZones,
  scheduleText,
}: {
  form: CourseFormApi<CourseFormWithImageValues>;
  timeZones: string[];
  scheduleText: string | undefined;
}) {
  return (
    <ScheduleSection scheduleText={scheduleText}>
      <ScheduleProblems
        form={form}
        names={[scheduleNames.startTimeOfDay, scheduleNames.endTimeOfDay]}
      />
      <TimeZoneField
        form={form}
        name="schedule.timeZone"
        recheck={["schedule", "prices"]}
        timeZones={timeZones}
      />
      <ScheduleDateTimeFields form={form} names={scheduleNames} />
    </ScheduleSection>
  );
}
