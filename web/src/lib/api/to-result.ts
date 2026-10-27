import type { ProblemDetails, Result } from "../types";

type ApiAnswer<T> = {
  data?: T;
  error?: unknown;
  response: Response;
};

function isProblemDetails(value: unknown): value is ProblemDetails {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const { title, detail, code } = value as Record<string, unknown>;
  return (
    typeof title === "string" &&
    typeof detail === "string" &&
    typeof code === "string"
  );
}

/**
 * Turns an openapi-fetch answer into a `Result`. A 2xx is a success (`data`
 * is undefined for a 204). An error status is a failure only when the body is
 * a problem body; anything else is unexpected and throws.
 */
export function toResult<T>({
  data,
  error,
  response,
}: ApiAnswer<T>): Result<T, ProblemDetails> {
  if (response.ok) {
    return { state: "success", data: data as T };
  }

  if (isProblemDetails(error)) {
    return { state: "failure", error };
  }

  const { pathname } = new URL(response.url);
  throw new Error(
    `API answered ${response.status} without a problem body (${pathname})`,
  );
}
