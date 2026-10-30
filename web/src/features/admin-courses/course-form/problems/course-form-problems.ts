import { get, type FieldErrors } from "react-hook-form";

import type { ErrorSummaryProblem } from "@/components/form/error-summary";

/** The error message at a field's path, if it has one. */
export function fieldErrorMessage(
  errors: FieldErrors,
  fieldName: string,
): string | undefined {
  const message = (get(errors, fieldName) as { message?: unknown } | undefined)
    ?.message;
  return typeof message === "string" ? message : undefined;
}

/** The kind of error at a field's path ("custom" for a cross-field check). */
export function fieldErrorType(
  errors: FieldErrors,
  fieldName: string,
): string | undefined {
  return (get(errors, fieldName) as { type?: string } | undefined)?.type;
}

/** A field's name and the label the error list shows for it. */
export type ProblemField = readonly [fieldName: string, label: string];

/**
 * One entry per field with a message, in the order of `fields`. The
 * description is one field however many errors a bad paste caused.
 */
export function courseFormProblems(
  errors: FieldErrors,
  fields: readonly ProblemField[],
): ErrorSummaryProblem[] {
  return fields.flatMap(([fieldName, label]) => {
    const message = fieldErrorMessage(errors, fieldName);
    return message ? [{ fieldName, label, message }] : [];
  });
}
