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
