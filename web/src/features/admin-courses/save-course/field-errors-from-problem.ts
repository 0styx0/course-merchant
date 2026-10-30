import type { ProblemDetails, ValidationProblemDetails } from "@/lib/types";

/** A message for one form field, addressed by the form's own path. */
export type FormFieldError = { path: string; message: string };

const SAME_NAME_FIELDS = new Set(["name", "summary", "contentUrl", "image"]);

// The date and time of day are two boxes for one value; the time box takes the message.
const SCHEDULE_PATHS: Record<string, string> = {
  startTime: "schedule.startTimeOfDay",
  endTime: "schedule.endTimeOfDay",
  timeZone: "schedule.timeZone",
};

const PRICE_PATHS: Record<string, string> = {
  amount: "amountDollars",
  effectiveAt: "effectiveTimeOfDay",
};

function priceFormPath(pointer: string): string | undefined {
  const [, , index, field] = pointer.split("/");
  if (!/^\d+$/.test(index ?? "")) return undefined;
  const formField = PRICE_PATHS[field];
  return formField && `prices.${index}.${formField}`;
}

/** Where the form shows an error for a part of the request body. */
function toFormPath(pointer: string): string | undefined {
  const [, first, second] = pointer.split("/");

  if (first === "description") return "description";
  if (SAME_NAME_FIELDS.has(first) && second === undefined) return first;
  if (first === "schedule") return SCHEDULE_PATHS[second];
  if (first === "prices") return priceFormPath(pointer);
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
