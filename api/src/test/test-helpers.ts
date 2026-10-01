import { Temporal } from "@js-temporal/polyfill";

export const instant = (value: string) =>
  Temporal.Instant.from(value);