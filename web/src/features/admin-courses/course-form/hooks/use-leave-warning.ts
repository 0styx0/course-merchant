import { useEffect } from "react";

/** Asks the browser to confirm before reloading or closing with unsaved work. */
export function useLeaveWarning(hasUnsavedChanges: boolean) {
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    function askBeforeLeaving(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener("beforeunload", askBeforeLeaving);
    return () => window.removeEventListener("beforeunload", askBeforeLeaving);
  }, [hasUnsavedChanges]);
}
