import { z } from "zod";

import type { ProblemDetails, Result } from "@/lib/types";

import {
  fieldErrorsFromProblem,
  type FormFieldError,
} from "./field-errors-from-problem";

export type CourseActionFailure = {
  problem: ProblemDetails;
  fieldErrors: FormFieldError[];
};

export type CourseActionResult = Result<
  { courseId: string },
  CourseActionFailure
>;

const invalidFormProblem: ProblemDetails = {
  title: "Validation failed",
  detail: "The form has fields that need fixing.",
  code: "VALIDATION_FAILED",
};

const invalidCourseIdProblem: ProblemDetails = {
  title: "Validation failed",
  detail: "The course id is not valid.",
  code: "VALIDATION_FAILED",
};

const uuidSchema = z.uuid();

export function isUuid(value: string): boolean {
  return uuidSchema.safeParse(value).success;
}

export function invalidCourseIdFailure(): CourseActionResult {
  return {
    state: "failure",
    error: { problem: invalidCourseIdProblem, fieldErrors: [] },
  };
}

export function invalidFormFailure(error: z.ZodError): CourseActionResult {
  return {
    state: "failure",
    error: {
      problem: invalidFormProblem,
      fieldErrors: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    },
  };
}

export function invalidImageFailure(): CourseActionResult {
  return {
    state: "failure",
    error: {
      problem: invalidFormProblem,
      fieldErrors: [{ path: "image", message: "Choose an image." }],
    },
  };
}

export function problemFailure(problem: ProblemDetails): CourseActionResult {
  return {
    state: "failure",
    error: { problem, fieldErrors: fieldErrorsFromProblem(problem) },
  };
}

export function successWithCourseId(courseId: string): CourseActionResult {
  return { state: "success", data: { courseId } };
}
