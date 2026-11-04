import { expect } from "vitest";

const TEMPORAL_TAG_PREFIX = "[object Temporal.";

function tagOf(value: unknown): string {
  return String(Object.prototype.toString.call(value));
}

function isTemporal(value: unknown): boolean {
  return tagOf(value).startsWith(TEMPORAL_TAG_PREFIX);
}

// The same file lives in api/src/test/, because the two packages share no
// source. Change both copies together.
// Vitest's `toMatchObject` finds two Temporal values equal whatever their time,
// because they hold no own properties. This tester decides whenever either
// side is a Temporal value and steps aside (returns undefined) otherwise.
function temporalEquality(a: unknown, b: unknown): boolean | undefined {
  if (!isTemporal(a) && !isTemporal(b)) return undefined;
  return tagOf(a) === tagOf(b) && String(a) === String(b);
}

expect.addEqualityTesters([temporalEquality]);
