"use client";

import type { FieldValues, Path } from "react-hook-form";

import { showsFieldError } from "@/components/form/validated-field";

import type { CourseFormApi } from "../fields/course-form-fields";
import { SCHEDULE_PROBLEMS_ID } from "./course-form-schedule-fields";
import {
  fieldErrorMessage,
  fieldErrorType,
} from "../problems/course-form-problems";

/** The cross-field messages of the named fields, shown by the same rule as a field's own. */
function scheduleMessages<T extends FieldValues>(
  form: CourseFormApi<T>,
  names: Path<T>[],
) {
  const { errors, isSubmitted } = form.formState;
  return names.flatMap((name) => {
    const message = fieldErrorMessage(errors, name);
    const isShown = showsFieldError({
      error: message,
      touched: form.getFieldState(name).isTouched,
      submitted: isSubmitted,
    });
    const isCrossField = fieldErrorType(errors, name) === "custom";
    return message && isShown && isCrossField ? [message] : [];
  });
}

/** One line per problem that compares the schedule's fields; empty when there is none. */
export function ScheduleProblems<T extends FieldValues>({
  form,
  names,
}: {
  form: CourseFormApi<T>;
  /** The start and end time, where the cross-field messages land. */
  names: Path<T>[];
}) {
  return (
    <div
      id={SCHEDULE_PROBLEMS_ID}
      className="text-sm text-destructive empty:hidden sm:col-span-2"
    >
      {scheduleMessages(form, names).map((message) => (
        <p key={message}>{message}</p>
      ))}
    </div>
  );
}
