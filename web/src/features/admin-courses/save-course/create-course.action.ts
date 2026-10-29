"use server";

import type { ProblemDetails, Result } from "@/lib/types";

import { createCourse } from "./admin-courses.api";
import {
  courseFormSchema,
  type CourseFormValues,
} from "../validation/course-form-schema";
import {
  fieldErrorsFromProblem,
  type FormFieldError,
} from "./field-errors-from-problem";
import { toCourseRequest } from "./to-course-request";

export type CreateCourseActionResult = Result<
  { courseId: string },
  { problem: ProblemDetails; fieldErrors: FormFieldError[] }
>;

const invalidFormProblem: ProblemDetails = {
  title: "Validation failed",
  detail: "The form has fields that need fixing.",
  code: "VALIDATION_FAILED",
};

/** Saves the form as a drafted course. */
export async function createCourseAction(
  values: CourseFormValues,
): Promise<CreateCourseActionResult> {
  // Anyone can call a Server Action with anything, so check again here.
  const checked = courseFormSchema.safeParse(values);
  if (!checked.success) {
    return {
      state: "failure",
      error: {
        problem: invalidFormProblem,
        fieldErrors: checked.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
    };
  }

  const result = await createCourse(toCourseRequest(checked.data, "drafted"));
  if (result.state === "failure") {
    return {
      state: "failure",
      error: {
        problem: result.error,
        fieldErrors: fieldErrorsFromProblem(result.error),
      },
    };
  }
  return { state: "success", data: { courseId: result.data.id } };
}
