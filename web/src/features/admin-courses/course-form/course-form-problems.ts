import { get, type FieldErrors } from "react-hook-form";

import type { ErrorSummaryProblem } from "@/components/form/error-summary";

import type { CourseFormWithImageValues } from "../validation/course-form-schema";

/** The form's fields in page order, with the label the error list shows. */
const COURSE_FORM_FIELD_LABELS = [
  ["image", "Image"],
  ["name", "Course name"],
  ["summary", "Summary"],
  ["description", "Description"],
  ["contentUrl", "Content link"],
  ["schedule.timeZone", "Time zone"],
  ["schedule.startDate", "Start date"],
  ["schedule.startTimeOfDay", "Start time"],
  ["schedule.endDate", "End date"],
  ["schedule.endTimeOfDay", "End time"],
] as const;

/**
 * The labels of one price row. They carry the row's number only when there are
 * several rows, so one row keeps the plain "Price".
 */
export function priceRowLabels(index: number, rowCount: number) {
  const price = rowCount > 1 ? `Price ${index + 1}` : "Price";
  return {
    amountDollars: price,
    effectiveDate: `${price} start date`,
    effectiveTimeOfDay: `${price} start time`,
  };
}

/** The price rows' fields in page order, after the fixed fields. */
function priceFieldLabels(rowCount: number) {
  return Array.from({ length: rowCount }, (_, index) => {
    const labels = priceRowLabels(index, rowCount);
    return [
      [`prices.${index}.amountDollars`, labels.amountDollars],
      [`prices.${index}.effectiveDate`, labels.effectiveDate],
      [`prices.${index}.effectiveTimeOfDay`, labels.effectiveTimeOfDay],
    ] as const;
  }).flat();
}

/** The error message at a field's path, if it has one. */
export function fieldErrorMessage(
  errors: FieldErrors<CourseFormWithImageValues>,
  fieldName: string,
): string | undefined {
  const message = (get(errors, fieldName) as { message?: unknown } | undefined)
    ?.message;
  return typeof message === "string" ? message : undefined;
}

/** The kind of error at a field's path ("custom" for a cross-field check). */
export function fieldErrorType(
  errors: FieldErrors<CourseFormWithImageValues>,
  fieldName: string,
): string | undefined {
  return (get(errors, fieldName) as { type?: string } | undefined)?.type;
}

/**
 * One entry per field with a message, in page order. The description is one
 * field however many errors a bad paste caused.
 */
export function courseFormProblems(
  errors: FieldErrors<CourseFormWithImageValues>,
  priceRowCount: number,
): ErrorSummaryProblem[] {
  const fields = [
    ...COURSE_FORM_FIELD_LABELS,
    ...priceFieldLabels(priceRowCount),
  ];
  return fields.flatMap(([fieldName, label]) => {
    const message = fieldErrorMessage(errors, fieldName);
    return message ? [{ fieldName, label, message }] : [];
  });
}
