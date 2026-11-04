import { describe, expect, it } from "vitest";

import type { ValidationProblemDetails } from "@/lib/types";
import { fieldErrorsByFormPath } from "./form-errors";

const FORM_PATHS: Record<string, string> = {
  "/name": "name",
  "/email": "email",
};

const toFormPath = (pointer: string) => FORM_PATHS[pointer];

function problemWith(
  ...errors: { field: string; detail: string }[]
): ValidationProblemDetails {
  return {
    title: "Invalid request",
    detail: "Some fields are invalid.",
    code: "VALIDATION_FAILED",
    errors: errors.map((error) => ({ ...error, code: "INVALID_VALUE" })),
  };
}

describe("fieldErrorsByFormPath", () => {
  it("returns an empty list when the problem has no field errors", () => {
    expect(
      fieldErrorsByFormPath({ title: "t", detail: "d", code: "C" }, toFormPath),
    ).toEqual([]);
  });

  it("leaves out a pointer the form has no field for", () => {
    const problem = problemWith({ field: "/unknown", detail: "Bad." });

    expect(fieldErrorsByFormPath(problem, toFormPath)).toEqual([]);
  });

  it("maps each placed pointer to the form path with the API's detail", () => {
    const problem = problemWith(
      { field: "/name", detail: "Name is too short." },
      { field: "/unknown", detail: "Bad." },
      { field: "/email", detail: "Email is invalid." },
    );

    expect(fieldErrorsByFormPath(problem, toFormPath)).toEqual([
      { path: "name", message: "Name is too short." },
      { path: "email", message: "Email is invalid." },
    ]);
  });

  it("leaves out a pointer the form maps to an empty path", () => {
    const problem = problemWith({ field: "/name", detail: "Bad." });

    expect(fieldErrorsByFormPath(problem, () => "")).toEqual([]);
  });
});
