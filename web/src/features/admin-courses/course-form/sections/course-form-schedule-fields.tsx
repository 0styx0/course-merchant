"use client";

import type { FieldPathByValue, FieldValues, PathValue } from "react-hook-form";

import { InputField, type CourseFormApi } from "../fields/course-form-fields";

/** The paths of the four boxes, each holding a string. */
export type ScheduleDateTimeNames<T extends FieldValues> = {
  startDate: FieldPathByValue<T, string>;
  startTimeOfDay: FieldPathByValue<T, string>;
  endDate: FieldPathByValue<T, string>;
  endTimeOfDay: FieldPathByValue<T, string>;
};

/** True when the admin has reached the field or it already shows a problem. */
function isReachedOrInvalid<T extends FieldValues>(
  form: CourseFormApi<T>,
  name: FieldPathByValue<T, string>,
) {
  const { isTouched, error } = form.getFieldState(name);
  return isTouched || Boolean(error);
}

/** Sets the box's value, marks it touched and checks it. */
function setScheduleBoxValue<T extends FieldValues>(
  form: CourseFormApi<T>,
  name: FieldPathByValue<T, string>,
  newValue: string,
) {
  // The library types `setValue`'s value as the field's type, which it can't
  // narrow to string for a generic `T`, so it needs this cast.
  form.setValue(name, newValue as PathValue<T, typeof name>, {
    shouldTouch: true,
    shouldValidate: true,
  });
}

/** Checks again the other schedule boxes the admin has reached or that show a problem. */
function recheckOtherReachedBoxes<T extends FieldValues>(
  form: CourseFormApi<T>,
  changedName: FieldPathByValue<T, string>,
  allNames: FieldPathByValue<T, string>[],
) {
  const others = allNames.filter(
    (other) => other !== changedName && isReachedOrInvalid(form, other),
  );
  if (others.length > 0) void form.trigger(others);
}

/**
 * A native date picker may never blur its input, so a change marks the field
 * touched and checks it. The other schedule fields are checked too (they
 * compare with it), but only those already reached, so none is flagged early.
 */
function makeScheduleChangeHandler<T extends FieldValues>(
  form: CourseFormApi<T>,
  name: FieldPathByValue<T, string>,
  allNames: FieldPathByValue<T, string>[],
) {
  return (event: { target: { value: string } }) => {
    setScheduleBoxValue(form, name, event.target.value);
    recheckOtherReachedBoxes(form, name, allNames);
  };
}

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
        onChange: makeScheduleChangeHandler(form, name, allNames),
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
