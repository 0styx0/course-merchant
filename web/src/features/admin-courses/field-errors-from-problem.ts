import type { ProblemDetails, ValidationProblemDetails } from "@/lib/types";

/** A message for one form field, addressed by the form's own path. */
export type FormFieldError = { path: string; message: string };

const SAME_NAME_FIELDS = new Set(["name", "summary", "contentUrl"]);

/** Where the form shows an error for a part of the request body. */
function toFormPath(pointer: string): string | undefined {
  const [, first, second] = pointer.split("/");

  if (first === "description") return "description";
  if (SAME_NAME_FIELDS.has(first) && second === undefined) return first;

  if (first === "schedule") {
    // The date and time of day are two boxes for one value; the time box takes the message.
    if (second === "startTime") return "schedule.startTimeOfDay";
    if (second === "endTime") return "schedule.endTimeOfDay";
    if (second === "timeZone") return "schedule.timeZone";
    return undefined;
  }

  if (first === "prices") {
    const [, , index, field] = pointer.split("/");
    if (!/^\d+$/.test(index ?? "")) return undefined;
    if (field === "amount") return `prices.${index}.amountDollars`;
    if (field === "effectiveAt") return `prices.${index}.effectiveTimeOfDay`;
  }

  return undefined;
}

/**
 * Keeps the API's field errors the form has a field for. The others are left
 * out: they show only in the summary, which comes from the problem's `detail`.
 */
export function fieldErrorsFromProblem(
  problem: ProblemDetails | ValidationProblemDetails,
): FormFieldError[] {
  if (!("errors" in problem) || !Array.isArray(problem.errors)) return [];

  return problem.errors.flatMap(({ field, detail }) => {
    const path = toFormPath(field);
    return path ? [{ path, message: detail }] : [];
  });
}
