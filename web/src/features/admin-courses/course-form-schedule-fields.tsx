"use client";

import type { UseFormReturn } from "react-hook-form";

import { InputField } from "./course-form-fields";
import type { CourseFormWithImageValues } from "./validation/course-form-schema";

type CourseFormApi = UseFormReturn<CourseFormWithImageValues>;

const SCHEDULE_DATE_TIME_FIELDS = [
  "schedule.startDate",
  "schedule.startTimeOfDay",
  "schedule.endDate",
  "schedule.endTimeOfDay",
] as const;

type ScheduleDateTimeField = (typeof SCHEDULE_DATE_TIME_FIELDS)[number];

/** True when the admin has reached the field or it already shows a problem. */
function isReached(form: CourseFormApi, name: ScheduleDateTimeField) {
  const { isTouched, error } = form.getFieldState(name);
  return isTouched || Boolean(error);
}

/**
 * A native date picker may never blur its input, so a change marks the field
 * touched and checks it. The other schedule fields are checked too (they
 * compare with it), but only those already reached, so none is flagged early.
 */
function makeScheduleChangeHandler(
  form: CourseFormApi,
  name: ScheduleDateTimeField,
) {
  return (event: { target: { value: string } }) => {
    form.setValue(name, event.target.value, {
      shouldTouch: true,
      shouldValidate: true,
    });
    const others = SCHEDULE_DATE_TIME_FIELDS.filter(
      (other) => other !== name && isReached(form, other),
    );
    if (others.length > 0) void form.trigger(others);
  };
}

function ScheduleDateTimeField({
  form,
  name,
  label,
  type,
}: {
  form: CourseFormApi;
  name: ScheduleDateTimeField;
  label: string;
  type: "date" | "time";
}) {
  return (
    <InputField
      form={form}
      name={name}
      label={label}
      type={type}
      registerOptions={{ onChange: makeScheduleChangeHandler(form, name) }}
    />
  );
}

/** The start and end date and time boxes, in page order. */
export function ScheduleDateTimeFields({ form }: { form: CourseFormApi }) {
  return (
    <>
      <ScheduleDateTimeField
        form={form}
        name="schedule.startDate"
        label="Start date"
        type="date"
      />
      <ScheduleDateTimeField
        form={form}
        name="schedule.startTimeOfDay"
        label="Start time"
        type="time"
      />
      <ScheduleDateTimeField
        form={form}
        name="schedule.endDate"
        label="End date"
        type="date"
      />
      <ScheduleDateTimeField
        form={form}
        name="schedule.endTimeOfDay"
        label="End time"
        type="time"
      />
    </>
  );
}
