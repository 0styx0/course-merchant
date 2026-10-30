"use client";

import type { UseFormReturn } from "react-hook-form";

import { showsFieldError } from "@/components/form/validated-field";

import { SCHEDULE_PROBLEMS_ID } from "./course-form-schedule-fields";
import { fieldErrorMessage, fieldErrorType } from "./course-form-problems";
import type { CourseFormWithImageValues } from "../validation/course-form-schema";

const TIME_FIELDS = [
  "schedule.startTimeOfDay",
  "schedule.endTimeOfDay",
] as const;

/** The cross-field messages of the start and end time, shown by the same rule as a field's own. */
function scheduleMessages(form: UseFormReturn<CourseFormWithImageValues>) {
  const { errors, isSubmitted } = form.formState;
  return TIME_FIELDS.flatMap((name) => {
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
export function ScheduleProblems({
  form,
}: {
  form: UseFormReturn<CourseFormWithImageValues>;
}) {
  return (
    <div
      id={SCHEDULE_PROBLEMS_ID}
      className="text-sm text-destructive empty:hidden sm:col-span-2"
    >
      {scheduleMessages(form).map((message) => (
        <p key={message}>{message}</p>
      ))}
    </div>
  );
}
