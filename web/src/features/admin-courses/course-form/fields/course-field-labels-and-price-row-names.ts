/**
 * The label of each course field both forms have. The keys are in page order,
 * which is the order of the error list.
 */
export const courseFieldLabels = {
  name: "Course name",
  summary: "Summary",
  description: "Description",
  contentUrl: "Content link",
  "schedule.timeZone": "Time zone",
  "schedule.startDate": "Start date",
  "schedule.startTimeOfDay": "Start time",
  "schedule.endDate": "End date",
  "schedule.endTimeOfDay": "End time",
} as const;

/**
 * The paths of one price row's three boxes. They are template literal types, so
 * they fit any form that has a `prices` list, with no cast.
 */
export function priceRowNames(index: number) {
  return {
    amountDollars: `prices.${index}.amountDollars`,
    effectiveDate: `prices.${index}.effectiveDate`,
    effectiveTimeOfDay: `prices.${index}.effectiveTimeOfDay`,
  } as const;
}
