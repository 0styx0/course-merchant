"use client";

import type { FieldPathByValue, FieldValues } from "react-hook-form";

import { InputField, type CourseFormApi } from "../fields/course-form-fields";
import { makeRecheckingChangeHandler } from "../fields/recheck-on-change";

/** The paths of the four boxes, each holding a string. */
export type ScheduleDateTimeNames<T extends FieldValues> = {
  startDate: FieldPathByValue<T, string>;
  startTimeOfDay: FieldPathByValue<T, string>;
  endDate: FieldPathByValue<T, string>;
  endTimeOfDay: FieldPathByValue<T, string>;
};

function ScheduleDateTimeField<T extends FieldValues>({
  form,
  name,
  allNames,
  label,
  type,
  min,
}: {
  form: CourseFormApi<T>;
  name: FieldPathByValue<T, string>;
  allNames: FieldPathByValue<T, string>[];
  label: string;
  type: "date" | "time";
  min?: string;
}) {
  return (
    <InputField
      form={form}
      name={name}
      label={label}
      type={type}
      min={min}
      registerOptions={{
        onChange: makeRecheckingChangeHandler(form, name, allNames),
      }}
    />
  );
}

/** The start and end date and time boxes, in page order. */
export function ScheduleDateTimeFields<T extends FieldValues>({
  form,
  names,
}: {
  form: CourseFormApi<T>;
  names: ScheduleDateTimeNames<T>;
}) {
  const startDate = form.watch(names.startDate);
  const allNames = Object.values<FieldPathByValue<T, string>>(names);
  const shared = { form, allNames };
  return (
    <>
      <ScheduleDateTimeField
        {...shared}
        name={names.startDate}
        label="Start date"
        type="date"
      />
      <ScheduleDateTimeField
        {...shared}
        name={names.startTimeOfDay}
        label="Start time"
        type="time"
      />
      <ScheduleDateTimeField
        {...shared}
        name={names.endDate}
        label="End date"
        type="date"
        min={startDate || undefined}
      />
      <ScheduleDateTimeField
        {...shared}
        name={names.endTimeOfDay}
        label="End time"
        type="time"
      />
    </>
  );
}
