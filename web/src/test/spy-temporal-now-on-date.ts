import { Temporal } from "temporal-polyfill";
import { vi } from "vitest";

const currentInstant = () => Temporal.Instant.fromEpochMilliseconds(Date.now());

type ZoneArgument = Parameters<typeof Temporal.Now.zonedDateTimeISO>[0];

const currentZonedDateTime = (zone: ZoneArgument = Temporal.Now.timeZoneId()) =>
  currentInstant().toZonedDateTimeISO(zone);

const currentPlainDateTime = (zone?: ZoneArgument) =>
  currentZonedDateTime(zone).toPlainDateTime();

const currentPlainDate = (zone?: ZoneArgument) =>
  currentZonedDateTime(zone).toPlainDate();

const currentPlainTime = (zone?: ZoneArgument) =>
  currentZonedDateTime(zone).toPlainTime();

// Replaces the five time-returning methods of the polyfill's `Temporal.Now` with versions that
// read the (faked) `Date`. Official Node builds include a built-in Temporal, which the polyfill
// hands back, and its `Temporal.Now` reads the machine clock instead. Vitest restores the spies
// after each test.
export function spyTemporalNowOnDate() {
  vi.spyOn(Temporal.Now, "instant").mockImplementation(currentInstant);
  vi.spyOn(Temporal.Now, "zonedDateTimeISO").mockImplementation(
    currentZonedDateTime,
  );
  vi.spyOn(Temporal.Now, "plainDateTimeISO").mockImplementation(
    currentPlainDateTime,
  );
  vi.spyOn(Temporal.Now, "plainDateISO").mockImplementation(currentPlainDate);
  vi.spyOn(Temporal.Now, "plainTimeISO").mockImplementation(currentPlainTime);
}
