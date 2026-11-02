import { courseFieldLabels } from "../course-form/fields/course-field-labels-and-price-row-names";
import type { ProblemField } from "../course-form/problems/course-form-problems";
import { priceRowFields } from "../price/price-row-labels";

/** The image is create's own field; edit uploads it in a separate step. */
const IMAGE_LABEL = "Image";

/** Every field the error list can name, as `[name, label]` in page order. */
export function createCourseFields(rowCount: number): ProblemField[] {
  const priceFields = Array.from({ length: rowCount }, (_, index) =>
    priceRowFields(index, rowCount),
  ).flat();
  return [
    ["image", IMAGE_LABEL],
    ...Object.entries(courseFieldLabels),
    ...priceFields,
  ];
}
