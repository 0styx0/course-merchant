import { courseFieldLabels } from "../course-form/fields/course-field-labels-and-price-row-names";
import type { ProblemField } from "../course-form/problems/course-form-problems";
import { priceRowFields } from "../price/price-row-labels";

/** The status field's label; create has no status, so it stays out of the shared labels. */
export const statusFieldLabel = "Status";

/**
 * Every field the edit error list can name, as `[name, label]` in page order,
 * so a price problem never blocks Save without a message.
 */
export function editCourseFields(priceRowCount: number): ProblemField[] {
  const priceFields = Array.from({ length: priceRowCount }, (_, index) =>
    priceRowFields(index, priceRowCount),
  ).flat();
  return [
    ["image", courseFieldLabels.image],
    ["name", courseFieldLabels.name],
    ["summary", courseFieldLabels.summary],
    ["description", courseFieldLabels.description],
    ["contentUrl", courseFieldLabels.contentUrl],
    ["schedule.timeZone", courseFieldLabels["schedule.timeZone"]],
    ["schedule.startDate", courseFieldLabels["schedule.startDate"]],
    ["schedule.startTimeOfDay", courseFieldLabels["schedule.startTimeOfDay"]],
    ["schedule.endDate", courseFieldLabels["schedule.endDate"]],
    ["schedule.endTimeOfDay", courseFieldLabels["schedule.endTimeOfDay"]],
    ...priceFields,
    ["status", statusFieldLabel],
  ];
}
