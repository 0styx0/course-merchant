import type { Temporal } from "@js-temporal/polyfill";

// A login lasts at most 7 days and ends after 24 hours unused. Constants, not
// env settings: there is nothing to configure per deployment.
const MAX_AGE_DAYS = 7;
const MAX_IDLE_HOURS = 24;
// the last-used time is refreshed at most this often, not on every request
const TOUCH_EVERY_MINUTES = 5;

export interface ActiveSessionCutoffs {
  /** Sessions created before this are too old. */
  createdAfter: Temporal.Instant;
  /** Sessions last used before this have sat idle too long. */
  usedAfter: Temporal.Instant;
}

export function activeSessionCutoffs(
  now: Temporal.Instant,
): ActiveSessionCutoffs {
  return {
    createdAfter: now.subtract({ hours: MAX_AGE_DAYS * 24 }),
    usedAfter: now.subtract({ hours: MAX_IDLE_HOURS }),
  };
}

/** The latest a session can end; sitting idle ends it sooner. */
export function absoluteExpiresAt(
  createdAt: Temporal.Instant,
): Temporal.Instant {
  return createdAt.add({ hours: MAX_AGE_DAYS * 24 });
}

/** The sessions last used before this are due for a refresh. */
export function touchCutoff(now: Temporal.Instant): Temporal.Instant {
  return now.subtract({ minutes: TOUCH_EVERY_MINUTES });
}
