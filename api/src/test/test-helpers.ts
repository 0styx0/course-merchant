import { Temporal } from "@js-temporal/polyfill";

export const instant = (value: string) => Temporal.Instant.from(value);

export function toDatabasePrecision(value: string): string {
  return Temporal.Instant.from(value)
    .round({ smallestUnit: "microseconds" })
    .toString();
}
