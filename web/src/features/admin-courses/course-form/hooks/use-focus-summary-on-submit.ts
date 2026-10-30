import { useEffect, type RefObject } from "react";

/** After each submit attempt, moves focus to the list of problems. */
export function useFocusSummaryOnSubmit(
  summaryRef: RefObject<HTMLElement | null>,
  submitCount: number,
) {
  useEffect(() => {
    summaryRef.current?.focus();
  }, [summaryRef, submitCount]);
}
