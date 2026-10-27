import { describe, expect, it } from "vitest";

import { toResult } from "./to-result";

const problem = {
  title: "Course not found",
  detail: "No course exists with that ID.",
  code: "COURSE_NOT_FOUND",
};

function answer(
  status: number,
  parts: { data?: unknown; error?: unknown } = {},
) {
  const response = new Response(null, { status });
  Object.defineProperty(response, "url", {
    value: "http://localhost:3001/v1/courses/abc",
  });
  return { ...parts, response };
}

describe("toResult", () => {
  it("returns the data of a 2xx answer", () => {
    expect(toResult(answer(200, { data: { id: "1" } }))).toEqual({
      state: "success",
      data: { id: "1" },
    });
  });

  it("treats a 204 without a body as a success", () => {
    expect(toResult(answer(204))).toEqual({
      state: "success",
      data: undefined,
    });
  });

  it("returns a problem body as a failure", () => {
    expect(toResult(answer(404, { error: problem }))).toEqual({
      state: "failure",
      error: problem,
    });
  });

  it.each([
    ["an empty body", undefined],
    ["a plain text body", "Bad Gateway"],
    ["JSON without a code", { title: "x", detail: "y" }],
  ])("throws on an error status with %s", (_name, error) => {
    expect(() => toResult(answer(502, { error }))).toThrow(
      "API answered 502 without a problem body (/v1/courses/abc)",
    );
  });
});
