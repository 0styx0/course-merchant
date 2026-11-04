import type { Ref } from "react";

import { StickyFormNotice } from "@/components/form/sticky-form-notice";
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
 * Not `ProblemAlert`: the surrounding `StickyFormNotice` is already the alert box,
 * so this only lays out the API's title and detail inside it.
 */
function ServerProblem({ title, detail }: { title: string; detail: string }) {
  return (
    <>
      <h2 className="font-medium text-foreground">{title}</h2>
      <p className="text-muted-foreground">{detail}</p>
    </>
  );
}

function ProblemList({
  problems,
  onSelectField,
}: Pick<ErrorSummaryProps, "problems" | "onSelectField">) {
  return (
    <>
      <h2 className="font-medium text-foreground">
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
  );
}

/**
 * Every problem in the form in one place, so a screen reader reads them all at
 * once. Each entry is a button styled as a link: the field's id lives inside
 * `ValidatedField`, so the caller does the focusing. Renders nothing when there are
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
    <StickyFormNotice
      ref={ref}
      tabIndex={-1}
      role="alert"
      className="max-h-48 overflow-y-auto border-destructive outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {serverProblem && <ServerProblem {...serverProblem} />}
      {problems.length > 0 && (
        <ProblemList problems={problems} onSelectField={onSelectField} />
      )}
    </StickyFormNotice>
  );
}
