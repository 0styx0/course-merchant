import { Temporal } from "@js-temporal/polyfill";

// how far back login attempts count toward an email's limit; older ones are
// deleted by the cleanup job
export const ATTEMPT_WINDOW_MINUTES = 15;

/** The oldest time a login attempt still counts toward the limit. */
export function attemptWindowStart(): Temporal.Instant {
  return Temporal.Now.instant().subtract({ minutes: ATTEMPT_WINDOW_MINUTES });
}
