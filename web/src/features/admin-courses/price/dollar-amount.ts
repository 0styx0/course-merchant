/** Reads a comma as the decimal mark, so `79,50` is `79.50`. */
export function normalizeDollars(dollars: string): string {
  return dollars.replace(",", ".");
}

/** Safe for amounts with at most two decimals: rounding only absorbs float noise. */
export function toCents(dollars: string): number {
  return Math.round(Number(normalizeDollars(dollars)) * 100);
}

/** Whole cents as the text a price box shows: 7950 is "79.50", 0 is "0.00". */
export function toDollarText(cents: number): string {
  return (cents / 100).toFixed(2);
}
