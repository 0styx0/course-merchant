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
  BasicsSection,
  ScheduleSection,
} from "../course-form/sections/course-form-sections";
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

/** Edit's schedule: the zone, and the sentence for the start and end in the boxes. */
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
      <TimeZoneField
        form={form}
        name="schedule.timeZone"
        recheck={[]}
        timeZones={timeZones}
      />
    </ScheduleSection>
  );
}
