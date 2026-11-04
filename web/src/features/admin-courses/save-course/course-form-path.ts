const SAME_NAME_FIELDS = new Set([
  "name",
  "summary",
  "contentUrl",
  "image",
  "status",
]);

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

function priceFormPath(index: string, field: string): string | undefined {
  if (!/^\d+$/.test(index)) return undefined;
  const formField = PRICE_PATHS[field];
  return formField && `prices.${index}.${formField}`;
}

/**
 * Where the course form shows an error for a part of the request body, or
 * nothing when the form has no field for it. Such errors show only in the
 * summary, which comes from the problem's `detail`.
 */
export function courseFormPath(pointer: string): string | undefined {
  const [, first, second, third] = pointer.split("/");

  if (first === "description") return "description";
  if (SAME_NAME_FIELDS.has(first) && second === undefined) return first;
  if (first === "schedule") return SCHEDULE_PATHS[second];
  if (first === "prices") return priceFormPath(second, third);
  return undefined;
}
