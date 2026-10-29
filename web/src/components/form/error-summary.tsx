import type { Ref } from "react";

import { Button } from "@/components/ui/button";

export type ErrorSummaryProblem = {
  /** Identifies the field to the caller's `onSelectField`. */
  fieldName: string;
  label: string;
  message: string;
};

type ErrorSummaryProps = {
  /** One entry per field with a problem. */
  problems: ErrorSummaryProblem[];
  /** The API's answer when it refused a request the browser checks passed. */
  serverProblem?: { title: string; detail: string };
  /** Called when a problem's link is clicked; the caller focuses that field. */
  onSelectField: (fieldName: string) => void;
  /** Lets the form move focus here after a refused submit. */
  ref?: Ref<HTMLDivElement>;
};

function headingFor(count: number): string {
  return `Fix ${count} ${count === 1 ? "problem" : "problems"} before saving`;
}

/**
 * Every problem in the form in one place, so a screen reader reads them all at
 * once. Each entry is a button styled as a link: the field's id lives inside
 * `FormField`, so the caller does the focusing. Renders nothing when there are
 * no problems; the caller decides when it first appears.
 */
export function ErrorSummary({
  problems,
  serverProblem,
  onSelectField,
  ref,
}: ErrorSummaryProps) {
  if (problems.length === 0 && !serverProblem) return null;

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="alert"
      className="sticky top-0 z-10 max-h-48 overflow-y-auto rounded-lg border border-destructive bg-background p-4 text-sm outline-none focus-visible:ring-3 focus-visible:ring-destructive/40"
    >
      {serverProblem && (
        <>
          <h2 className="font-medium text-destructive">
            {serverProblem.title}
          </h2>
          <p>{serverProblem.detail}</p>
        </>
      )}
      {problems.length > 0 && (
        <>
          <h2 className="font-medium text-destructive">
            {headingFor(problems.length)}
          </h2>
          <ul className="mt-2 list-disc pl-5">
            {problems.map(({ fieldName, label, message }) => (
              <li key={fieldName}>
                <Button
                  variant="link"
                  className="h-auto p-0 whitespace-normal"
                  onClick={() => onSelectField(fieldName)}
                >
                  {label}
                </Button>
                : {message}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
