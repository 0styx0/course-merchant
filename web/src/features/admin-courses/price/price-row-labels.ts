import { priceRowNames } from "../course-form/fields/course-field-labels-and-price-row-names";

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

/** One price row's boxes as `[name, label]`, in page order, for the error list. */
export function priceRowFields(index: number, rowCount: number) {
  const names = priceRowNames(index);
  const labels = priceRowLabels(index, rowCount);
  return [
    [names.amountDollars, labels.amountDollars],
    [names.effectiveDate, labels.effectiveDate],
    [names.effectiveTimeOfDay, labels.effectiveTimeOfDay],
  ] as const;
}
