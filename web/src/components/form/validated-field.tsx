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
  touched: boolean;
  /** The form has been submitted at least once. */
  submitted: boolean;
  /** The id of a message shown elsewhere on the page; the field then draws none. */
  errorMessageId?: string;
  /** Called when the label is clicked, for inputs a label can't focus itself. */
  onLabelClick?: () => void;
  /** Renders the one input; spread the props it receives onto the input. */
  children: (inputProps: ValidatedFieldInputProps) => ReactNode;
};

function describedByIds(...ids: (string | undefined)[]) {
  return ids.filter(Boolean).join(" ") || undefined;
}

/** The mark beside an input: a cross when it has a problem, a tick when it is valid. */
function StatusIcon({
  showsError,
  showsValid,
}: {
  showsError: boolean;
  showsValid: boolean;
}) {
  if (showsError) {
    return <X aria-hidden className="size-4 shrink-0 text-destructive" />;
  }
  if (showsValid) {
    return <Check aria-hidden className="size-4 shrink-0 text-green-600" />;
  }
  return null;
}

/** A problem shows once the field has been touched or the form submitted. */
export function showsFieldError({
  error,
  touched,
  submitted,
}: {
  error: string | undefined;
  touched: boolean;
  submitted: boolean;
}) {
  return Boolean(error) && (touched || submitted);
}

/** What the input receives; it is described by the help text and the message, when shown. */
function makeInputProps(
  ids: { id: string; labelId: string; descriptionId: string; errorId: string },
  showsError: boolean,
  hasDescription: boolean,
): ValidatedFieldInputProps {
  return {
    id: ids.id,
    labelId: ids.labelId,
    "aria-invalid": showsError,
    "aria-describedby": describedByIds(
      hasDescription ? ids.descriptionId : undefined,
      showsError ? ids.errorId : undefined,
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
  touched,
  submitted,
  errorMessageId,
  onLabelClick,
  children,
}: ValidatedFieldProps) {
  const id = useId();
  const labelId = `${id}-label`;
  const descriptionId = `${id}-description`;
  const errorId = errorMessageId ?? `${id}-error`;
  const showsError = showsFieldError({ error, touched, submitted });
  return (
    <Field data-invalid={showsError}>
      <FieldLabel id={labelId} htmlFor={id} onClick={onLabelClick}>
        {label}
      </FieldLabel>
      <div className="flex items-center gap-2">
        {children(
          makeInputProps(
            { id, labelId, descriptionId, errorId },
            showsError,
            Boolean(description),
          ),
        )}
        <StatusIcon showsError={showsError} showsValid={!error && touched} />
      </div>
      <FieldNotes
        description={description}
        descriptionId={descriptionId}
        error={showsError && !errorMessageId ? error : undefined}
        errorId={errorId}
      />
    </Field>
  );
}
