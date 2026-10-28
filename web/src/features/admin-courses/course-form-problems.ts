import { get, type FieldErrors } from "react-hook-form";

import type { ErrorSummaryProblem } from "@/components/form/error-summary";

import type { CourseFormValues } from "./course-form-schema";

/** The form's fields in page order, with the label the error list shows. */
export const COURSE_FORM_FIELD_LABELS = [
  ["name", "Course name"],
  ["summary", "Summary"],
  ["description", "Description"],
  ["contentUrl", "Content link"],
  ["schedule.startDate", "Start date"],
  ["schedule.startTimeOfDay", "Start time"],
  ["schedule.endDate", "End date"],
  ["schedule.endTimeOfDay", "End time"],
  ["schedule.timeZone", "Time zone"],
  ["prices.0.amountDollars", "Price"],
  ["prices.0.effectiveDate", "Price start date"],
  ["prices.0.effectiveTimeOfDay", "Price start time"],
] as const;

/** The error message at a field's path, if it has one. */
export function fieldErrorMessage(
  errors: FieldErrors<CourseFormValues>,
  fieldName: string,
): string | undefined {
  const message = (get(errors, fieldName) as { message?: unknown } | undefined)
    ?.message;
  return typeof message === "string" ? message : undefined;
}

/**
 * One entry per field with a message, in page order. The description is one
 * field however many errors a bad paste caused.
 */
export function courseFormProblems(
  errors: FieldErrors<CourseFormValues>,
): ErrorSummaryProblem[] {
  return COURSE_FORM_FIELD_LABELS.flatMap(([fieldName, label]) => {
    const message = fieldErrorMessage(errors, fieldName);
    return message ? [{ fieldName, label, message }] : [];
  });
}
