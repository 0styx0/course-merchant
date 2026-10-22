import type { Temporal } from "@js-temporal/polyfill";

export const MAX_SEND_ATTEMPTS = 8;

const BASE_DELAY_SECONDS = 60;
const MAX_DELAY_SECONDS = 60 * 60;

/**
 * When to retry an email that has now failed `failedAttempts` times: the delay
 * doubles from a minute up to an hour. Null once the attempts are used up.
 */
export function nextAttemptAfterFailure(
  failedAttempts: number,
  now: Temporal.Instant,
): Temporal.Instant | null {
  if (failedAttempts >= MAX_SEND_ATTEMPTS) {
    return null;
  }

  const delaySeconds = Math.min(
    BASE_DELAY_SECONDS * 2 ** (failedAttempts - 1),
    MAX_DELAY_SECONDS,
  );

  return now.add({ seconds: delaySeconds });
}
