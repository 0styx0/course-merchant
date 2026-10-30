import { courseFieldLabels } from "../course-form/fields/course-field-labels-and-price-row-names";
import type { ProblemField } from "../course-form/problems/course-form-problems";

/** Every field the edit error list can name, as `[name, label]` in page order. */
export const editCourseFields: ProblemField[] = [
  ["name", courseFieldLabels.name],
  ["summary", courseFieldLabels.summary],
  ["description", courseFieldLabels.description],
  ["contentUrl", courseFieldLabels.contentUrl],
  ["schedule.timeZone", courseFieldLabels["schedule.timeZone"]],
];
