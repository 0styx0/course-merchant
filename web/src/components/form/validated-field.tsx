import { Check, X } from "lucide-react";
import { useId, type ReactNode } from "react";

import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";

export type ValidatedFieldInputProps = {
  id?: string;
  /** For inputs that aren't labelable elements and use `aria-labelledby`. */
  labelId?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

type ValidatedFieldProps = {
  label: string;
  /** Help text shown under the input. */
  description?: ReactNode;
  /** The field's current problem, if any. */
  error?: string;
  /** The admin has focused the field and left it. */
  isTouched: boolean;
  /** The form has been submitted at least once. */
  isSubmitted: boolean;
  /** Called when the label is clicked, for inputs a label can't focus itself. */
  onLabelClick?: () => void;
  /** Renders the one input; spread the props it receives onto the input. */
  children: (inputProps: ValidatedFieldInputProps) => ReactNode;
};

function describedByIds(...ids: (string | undefined)[]) {
  return ids.filter(Boolean).join(" ") || undefined;
}

/** The mark inside the slot: a cross when the input has a problem, a tick when it is valid. */
function StatusMark({
  doesShowError,
  doesShowValid,
}: {
  doesShowError: boolean;
  doesShowValid: boolean;
}) {
  if (doesShowError) {
    return (
      <X
        role="img"
        aria-label="Needs a fix"
        className="size-4 text-destructive"
      />
    );
  }
  if (doesShowValid) {
    return (
      <Check
        role="img"
        aria-label="Looks good"
        className="size-4 text-green-600"
      />
    );
  }
  return null;
}

/** A slot of fixed size beside the input, so a mark appearing or clearing never shifts the input. */
function StatusIcon(props: { doesShowError: boolean; doesShowValid: boolean }) {
  return (
    <span data-slot="status-icon" className="size-4 shrink-0">
      <StatusMark {...props} />
    </span>
  );
}

/** A problem shows once the field has been touched or the form submitted. */
export function showsFieldError({
  error,
  isTouched,
  isSubmitted,
}: {
  error: string | undefined;
  isTouched: boolean;
  isSubmitted: boolean;
}) {
  return Boolean(error) && (isTouched || isSubmitted);
}

/** What the input receives; it is described by the help text and the message, when shown. */
function makeInputProps(
  ids: { id: string; labelId: string; descriptionId: string; errorId: string },
  doesShowError: boolean,
  hasDescription: boolean,
): ValidatedFieldInputProps {
  return {
    id: ids.id,
    labelId: ids.labelId,
    "aria-invalid": doesShowError,
    "aria-describedby": describedByIds(
      hasDescription ? ids.descriptionId : undefined,
      doesShowError ? ids.errorId : undefined,
    ),
  };
}

/** The help text, then the field's own message when it shows one. */
function FieldNotes({
  description,
  descriptionId,
  error,
  errorId,
}: {
  description: ReactNode;
  descriptionId: string;
  error: string | undefined;
  errorId: string;
}) {
  return (
    <>
      {description && (
        <FieldDescription id={descriptionId}>{description}</FieldDescription>
      )}
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </>
  );
}

/**
 * A label, an input and its state. A problem shows only once the field has
 * been touched or the form submitted, so a re-check started by another field
 * doesn't flag a field the admin hasn't reached.
 */
export function ValidatedField({
  label,
  description,
  error,
  isTouched,
  isSubmitted,
  onLabelClick,
  children,
}: ValidatedFieldProps) {
  const id = useId();
  const labelId = `${id}-label`;
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;
  const doesShowError = showsFieldError({ error, isTouched, isSubmitted });
  return (
    <Field data-invalid={doesShowError}>
      <FieldLabel id={labelId} htmlFor={id} onClick={onLabelClick}>
        {label}
      </FieldLabel>
      <div className="flex items-center gap-2">
        {children(
          makeInputProps(
            { id, labelId, descriptionId, errorId },
            doesShowError,
            Boolean(description),
          ),
        )}
        <StatusIcon
          doesShowError={doesShowError}
          doesShowValid={!error && isTouched}
        />
      </div>
      <FieldNotes
        description={description}
        descriptionId={descriptionId}
        error={doesShowError ? error : undefined}
        errorId={errorId}
      />
    </Field>
  );
}
