import { useState } from "react";
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";

import type { CourseActionFailure } from "../../save-course/course-action-result";

export type ServerProblem = { title: string; detail: string };

const actionThrewProblem: ServerProblem = {
  title: "Couldn't save the course",
  detail:
    "Something went wrong while saving. Check your connection and try again.",
};

/** The API's own title and detail for a refused save. */
export function refusalMessage({
  problem,
}: CourseActionFailure): ServerProblem {
  return { title: problem.title, detail: problem.detail };
}

/** The message above the form, and the errors put on its fields. */
export function useServerProblem<TValues extends FieldValues>(
  setError: UseFormSetError<TValues>,
) {
  const [serverProblem, setServerProblem] = useState<ServerProblem>();

  function showRefusal(problem: ServerProblem, failure: CourseActionFailure) {
    setServerProblem(problem);
    for (const { path, message } of failure.fieldErrors) {
      // A cast for a limit of the library's types: a plain string is not a `Path`.
      setError(path as Path<TValues>, { message });
    }
  }

  /** `extraDetail` is added after the usual text; start it with a space. */
  function showThrownProblem(extraDetail = "") {
    setServerProblem({
      ...actionThrewProblem,
      detail: actionThrewProblem.detail + extraDetail,
    });
  }

  return {
    serverProblem,
    showRefusal,
    showThrownProblem,
    clearServerProblem: () => setServerProblem(undefined),
  };
}
