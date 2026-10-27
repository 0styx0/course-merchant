/**
 * A `fetch` for openapi-fetch that aborts each call after `ms`. Every call
 * gets its own signal: a shared one would expire for every later call.
 */
export function fetchWithTimeout(ms: number) {
  return (request: Request) =>
    fetch(request, { signal: AbortSignal.timeout(ms) });
}
