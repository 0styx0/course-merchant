import type { ProblemDetails } from "@/lib/types";

type ProblemAlertProps = {
  problem: Pick<ProblemDetails, "title" | "detail">;
};

/** The one error box: the problem's title above its detail. */
export function ProblemAlert({ problem }: ProblemAlertProps) {
  return (
    <div role="alert" className="rounded-lg border border-destructive p-4">
      <p className="font-medium text-foreground">{problem.title}</p>
      <p className="mt-1 text-muted-foreground">{problem.detail}</p>
    </div>
  );
}
