import type { ProblemDetails } from "../types";

/**
 * Returns true when the API problem means no course exists at that ID, or the
 * ID is malformed.
 */
export function isCourseMissingProblem(problem: ProblemDetails): boolean {
  return (
    problem.code === "COURSE_NOT_FOUND" || problem.code === "INVALID_COURSE_ID"
  );
}
