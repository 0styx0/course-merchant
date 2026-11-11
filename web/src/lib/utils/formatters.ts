import { isFreePrice } from "./is-free-price";

/** "$99", "$49.50" or "Free" from an amount in cents: whole amounts drop their decimals, and 0 reads "Free". */
export function formatPrice(amount: number, currency: string) {
  if (isFreePrice(amount)) return "Free";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    trailingZeroDisplay: "stripIfInteger",
  }).format(amount / 100);
}

export function dateTimeFormatter(timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timeZone,
  });
}

export function dateOnlyFormatter(timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: timeZone,
  });
}
