"use client";

import { useWatch } from "react-hook-form";

import { courseFieldLabels } from "../course-form/fields/course-field-labels-and-price-row-names";
import {
  DescriptionField,
  InputField,
  TimeZoneField,
  type CourseFormApi,
} from "../course-form/sections/course-form-fields";
import {
  BasicsSection,
  ScheduleSection,
} from "../course-form/sections/course-form-sections";
import { scheduleSentence } from "../schedule/summary/schedule-summary";
import {
  COURSE_NAME_MAX_LENGTH,
  COURSE_SUMMARY_MAX_LENGTH,
} from "../validation/course-form-limits";
import type { EditCourseFormValues } from "../validation/edit-course-form-schema";
import type { KeptParts } from "./edit-course-start";

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

/** Edit's schedule: the zone, and the kept start and end shown in the chosen zone. */
export function EditScheduleSection({
  form,
  timeZones,
  keptSchedule,
}: {
  form: EditForm;
  timeZones: string[];
  keptSchedule: KeptParts["schedule"];
}) {
  const timeZone = useWatch({
    control: form.control,
    name: "schedule.timeZone",
  });
  // The sentence needs a real zone; a stored one the list lacks is reported on save.
  const scheduleText = timeZones.includes(timeZone)
    ? scheduleSentence(
        Date.parse(keptSchedule.startTime),
        Date.parse(keptSchedule.endTime),
        timeZone,
      )
    : undefined;

  return (
    <ScheduleSection scheduleText={scheduleText}>
      <TimeZoneField
        form={form}
        name="schedule.timeZone"
        recheck={[]}
        timeZones={timeZones}
      />
    </ScheduleSection>
  );
}
