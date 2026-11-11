/** A course is free when its price amount (in cents) is 0. */
export function isFreePrice(amountInCents: number) {
  return amountInCents === 0;
}
