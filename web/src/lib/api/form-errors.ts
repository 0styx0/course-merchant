import type { ProblemDetails, ValidationProblemDetails } from "@/lib/types";

/**
 * A message for one form field, addressed by the form's own path. It covers
 * errors from the API and from the browser's own checks.
 */
export type FormFieldError = { path: string; message: string };

/**
 * Turns the API's field errors into form-field errors. The caller's
 * `toFormPath` says where its form shows each part of the request body; parts
 * it returns nothing for are left out and show only in the summary, which comes
 * from the problem's `detail`.
 */
export function fieldErrorsByFormPath(
  problem: ProblemDetails | ValidationProblemDetails,
  toFormPath: (pointer: string) => string | undefined,
): FormFieldError[] {
  if (!("errors" in problem) || !Array.isArray(problem.errors)) return [];

  return problem.errors.flatMap(({ field, detail }) => {
    const path = toFormPath(field);
    return path ? [{ path, message: detail }] : [];
  });
}
