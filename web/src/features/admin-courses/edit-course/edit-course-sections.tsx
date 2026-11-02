"use client";

import { useWatch } from "react-hook-form";

import { courseFieldLabels } from "../course-form/fields/course-field-labels-and-price-row-names";
import {
  DescriptionField,
  InputField,
  TimeZoneField,
  type CourseFormApi,
} from "../course-form/fields/course-form-fields";
import {
  ScheduleDateTimeFields,
  type ScheduleDateTimeNames,
} from "../course-form/sections/course-form-schedule-fields";
import {
  BasicsSection,
  ScheduleSection,
} from "../course-form/sections/course-form-sections";
import { ScheduleProblems } from "../course-form/sections/schedule-problems";
import { scheduleSummary } from "../schedule/summary/schedule-summary";
import {
  COURSE_NAME_MAX_LENGTH,
  COURSE_SUMMARY_MAX_LENGTH,
} from "../validation/course-form-limits";
import type { EditCourseFormValues } from "../validation/edit-course-form-schema";

type EditForm = CourseFormApi<EditCourseFormValues>;

/** Edit's basics: the name, summary and description. */
export function EditBasicsSection({ form }: { form: EditForm }) {
  return (
    <BasicsSection>
      <InputField
        form={form}
        name="name"
        label={courseFieldLabels.name}
        limit={COURSE_NAME_MAX_LENGTH}
      />
      <InputField
        form={form}
        name="summary"
        label={courseFieldLabels.summary}
        limit={COURSE_SUMMARY_MAX_LENGTH}
      />
      <DescriptionField form={form} name="description" />
    </BasicsSection>
  );
}

const scheduleNames: ScheduleDateTimeNames<EditCourseFormValues> = {
  startDate: "schedule.startDate",
  startTimeOfDay: "schedule.startTimeOfDay",
  endDate: "schedule.endDate",
  endTimeOfDay: "schedule.endTimeOfDay",
};

/** Edit's schedule: the cross-field messages, the zone, the four boxes, and the sentence for them. */
export function EditScheduleSection({
  form,
  timeZones,
}: {
  form: EditForm;
  timeZones: string[];
}) {
  const schedule = useWatch({ control: form.control, name: "schedule" });

  return (
    <ScheduleSection scheduleText={scheduleSummary(schedule)}>
      <ScheduleProblems
        form={form}
        names={[scheduleNames.startTimeOfDay, scheduleNames.endTimeOfDay]}
      />
      <TimeZoneField
        form={form}
        name="schedule.timeZone"
        recheck={["schedule"]}
        timeZones={timeZones}
      />
      <ScheduleDateTimeFields form={form} names={scheduleNames} />
    </ScheduleSection>
  );
}
