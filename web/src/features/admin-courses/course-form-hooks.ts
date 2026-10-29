import { useRouter } from "next/navigation";
import { useEffect, useState, type RefObject } from "react";
import type { Path, UseFormReturn, UseFormReset } from "react-hook-form";

import {
  browserTimeZone,
  type CheckedCourseFormValues,
  type CourseFormValues,
} from "./validation/course-form-schema";
import { createCourseAction } from "./save-course/create-course.action";

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

type ServerProblem = { title: string; detail: string };

/**
 * Saves the form. A refused save leaves the API's problem and puts its field
 * errors on the form's fields; a saved one goes to the home page.
 */
export function useSaveCourse(
  form: UseFormReturn<CourseFormValues, unknown, CheckedCourseFormValues>,
) {
  const router = useRouter();
  const [serverProblem, setServerProblem] = useState<ServerProblem>();
  const [saved, setSaved] = useState(false);

  async function save(values: CheckedCourseFormValues) {
    setServerProblem(undefined);
    const result = await createCourseAction(values);
    if (result.state === "success") {
      setSaved(true);
      router.push("/");
      return;
    }
    const { problem, fieldErrors } = result.error;
    setServerProblem({ title: problem.title, detail: problem.detail });
    for (const { path, message } of fieldErrors) {
      form.setError(path as Path<CourseFormValues>, { message });
    }
  }

  return {
    save,
    saved,
    serverProblem,
    clearServerProblem: () => setServerProblem(undefined),
  };
}
