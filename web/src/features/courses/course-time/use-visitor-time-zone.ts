import { useSyncExternalStore } from "react";

// The browser's zone never changes while the page is open.
function subscribeToNothing() {
  return () => {};
}

function getBrowserTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function getTimeZoneOnServer() {
  return undefined;
}

/**
 * The visitor's IANA time zone, or `undefined` in the server render and the
 * hydration pass. Reading it only after hydration keeps the server's HTML and
 * the first browser render identical.
 */
export function useVisitorTimeZone(): string | undefined {
  return useSyncExternalStore(
    subscribeToNothing,
    getBrowserTimeZone,
    getTimeZoneOnServer,
  );
}
