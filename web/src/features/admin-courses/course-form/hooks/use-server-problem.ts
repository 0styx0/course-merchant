import { useState } from "react";
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";

import type { CourseActionFailure } from "../../save-course/course-action-result";

export type ServerProblem = { title: string; detail: string };

const rejectedProblem: ServerProblem = {
  title: "Couldn't save the course",
  detail:
    "Something went wrong while saving. Check your connection and try again.",
};

/** The message above the form, and the errors put on its fields. */
export function useServerProblem<TValues extends FieldValues>(
  setError: UseFormSetError<TValues>,
) {
  const [serverProblem, setServerProblem] = useState<ServerProblem>();

  function showFailure(problem: ServerProblem, failure: CourseActionFailure) {
    setServerProblem(problem);
    for (const { path, message } of failure.fieldErrors) {
      // A cast for a limit of the library's types: a plain string is not a `Path`.
      setError(path as Path<TValues>, { message });
    }
  }

  /** `note` is added after the usual text; start it with a space. */
  function showRejected(note = "") {
    setServerProblem({
      ...rejectedProblem,
      detail: rejectedProblem.detail + note,
    });
  }

  return {
    serverProblem,
    showFailure,
    showRejected,
    clearServerProblem: () => setServerProblem(undefined),
  };
}
