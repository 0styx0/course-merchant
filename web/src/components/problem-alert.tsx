import type { ProblemDetails } from "@/lib/types";

type ProblemAlertProps = {
  problem: ProblemDetails;
};

/** Callers branch on `problem.code`, never on `title`. */
export function ProblemAlert({ problem }: ProblemAlertProps) {
  return (
    <div
      role="alert"
      className="rounded-md border border-red-300 bg-red-100 p-4 text-red-950"
    >
      <p className="font-semibold">{problem.title}</p>
      <p className="mt-1">{problem.detail}</p>
    </div>
  );
}
