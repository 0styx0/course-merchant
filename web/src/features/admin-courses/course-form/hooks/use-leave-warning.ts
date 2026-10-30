import { useEffect } from "react";

/** Asks the browser to confirm before reloading or closing with unsaved work. */
export function useLeaveWarning(when: boolean) {
  useEffect(() => {
    if (!when) return;
    function warn(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [when]);
}
