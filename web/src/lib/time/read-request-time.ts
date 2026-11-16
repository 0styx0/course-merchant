/**
 * The current time in milliseconds since 1970. A server page calls it once per
 * request and passes the result down, so every check on the page (which
 * prices are in effect, whether the course has started) uses one moment, and
 * no component reads the clock while it renders.
 */
export function readRequestTime(): number {
  return Date.now();
}
