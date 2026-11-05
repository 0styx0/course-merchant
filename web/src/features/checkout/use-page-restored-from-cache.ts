import { useEffect, useEffectEvent } from "react";

/**
 * Calls `onRestore` when the browser shows this page again from its
 * back-forward cache (the visitor pressed Back), with every script frozen
 * exactly as it was left.
 */
export function usePageRestoredFromCache(onRestore: () => void) {
  const restore = useEffectEvent(onRestore);

  useEffect(() => {
    function restoreWhenFromCache(event: PageTransitionEvent) {
      if (event.persisted) restore();
    }
    window.addEventListener("pageshow", restoreWhenFromCache);
    return () => window.removeEventListener("pageshow", restoreWhenFromCache);
  }, []);
}
