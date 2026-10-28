import { Check, X } from "lucide-react";
import { useId, type ReactNode } from "react";

import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";

export type FormFieldInputProps = {
  id?: string;
  /** For inputs that aren't labelable elements and use `aria-labelledby`. */
  labelId?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

type FormFieldProps = {
  label: string;
  /** Help text shown under the input. */
  description?: ReactNode;
  /** The field's current problem, if any. */
  error?: string;
  /** The admin has focused the field and left it. */
  touched: boolean;
  /** The form has been submitted at least once. */
  submitted: boolean;
  /** Called when the label is clicked, for inputs a label can't focus itself. */
  onLabelClick?: () => void;
  /** Renders the one input; spread the props it receives onto the input. */
  children: (inputProps: FormFieldInputProps) => ReactNode;
};

/**
 * A label, an input and its state. A problem shows only once the field has
 * been touched or the form submitted, so a re-check started by another field
 * doesn't flag a field the admin hasn't reached.
 */
export function FormField({
  label,
  description,
  error,
  touched,
  submitted,
  onLabelClick,
  children,
}: FormFieldProps) {
  const id = useId();
  const labelId = `${id}-label`;
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;

  const showsError = Boolean(error) && (touched || submitted);
  const showsValid = !error && touched;
  const describedBy = [
    description ? descriptionId : undefined,
    showsError ? errorId : undefined,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Field data-invalid={showsError}>
      <FieldLabel id={labelId} htmlFor={id} onClick={onLabelClick}>
        {label}
      </FieldLabel>
      <div className="flex items-center gap-2">
        {children({
          id,
          labelId,
          "aria-invalid": showsError,
          "aria-describedby": describedBy || undefined,
        })}
        {showsError && (
          <X aria-hidden className="size-4 shrink-0 text-destructive" />
        )}
        {showsValid && (
          <Check aria-hidden className="size-4 shrink-0 text-green-600" />
        )}
      </div>
      {description && (
        <FieldDescription id={descriptionId}>{description}</FieldDescription>
      )}
      {showsError && <FieldError id={errorId}>{error}</FieldError>}
    </Field>
  );
}
