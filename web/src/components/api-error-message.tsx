import type { components } from "@/lib/api/generated";

type ProblemDetails = components["schemas"]["ProblemDetails"];

type ApiErrorMessageProps = {
  problem: ProblemDetails;
};

export function ApiErrorMessage({ problem }: ApiErrorMessageProps) {
  return (
    <div
      role="alert"
      className="rounded-md border border-red-300 bg-red-100 p-4 text-red-950"
    >
      <p className="font-semibold">{problem.title || 'An Error Occurred'}</p>
      <p className="mt-1">{problem.detail || 'Please reload the page and try again'}</p>
    </div>
  );
}