import { useEffect } from "react";
import type { UseFormReset } from "react-hook-form";

import {
  browserTimeZone,
  type CourseFormWithImageValues,
} from "../validation/course-form-schema";

/**
 * The browser's zone can't be read on the server, so it's set after the
 * first render. Resetting (not setting) keeps the form clean.
 */
export function useBrowserTimeZone(
  reset: UseFormReset<CourseFormWithImageValues>,
  timeZones: string[],
  defaultValues: CourseFormWithImageValues,
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
