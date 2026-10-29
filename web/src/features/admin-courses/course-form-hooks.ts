import { useEffect, type RefObject } from "react";
import type { UseFormReset } from "react-hook-form";

import { browserTimeZone, type CourseFormValues } from "./course-form-schema";

/** After each submit attempt, moves focus to the list of problems. */
export function useFocusSummaryOnSubmit(
  summaryRef: RefObject<HTMLElement | null>,
  submitCount: number,
) {
  useEffect(() => {
    summaryRef.current?.focus();
  }, [summaryRef, submitCount]);
}

/**
 * The browser's zone can't be read on the server, so it's set after the
 * first render. Resetting (not setting) keeps the form clean.
 */
export function useBrowserTimeZone(
  reset: UseFormReset<CourseFormValues>,
  timeZones: string[],
  defaultValues: CourseFormValues,
) {
  useEffect(() => {
    const timeZone = browserTimeZone();
    if (!timeZones.includes(timeZone)) return;
    reset({
      ...defaultValues,
      schedule: { ...defaultValues.schedule, timeZone },
    });
  }, [reset, timeZones, defaultValues]);
}

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
