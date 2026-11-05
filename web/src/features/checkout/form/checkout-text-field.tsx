import type { ComponentProps } from "react";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type CheckoutTextFieldProps = Omit<
  ComponentProps<typeof Input>,
  "id" | "aria-describedby" | "aria-invalid"
> & {
  id: string;
  label: string;
  hint?: string;
  message?: string;
};

/** One labelled box with an optional hint and, when the box is wrong, a message and a red border. */
export function CheckoutTextField({
  id,
  label,
  hint,
  message,
  ...inputProps
}: CheckoutTextFieldProps) {
  const hintId = `${id}-hint`;
  const messageId = `${id}-message`;
  const describedBy =
    [hint && hintId, message && messageId].filter(Boolean).join(" ") ||
    undefined;

  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        aria-describedby={describedBy}
        aria-invalid={message ? true : undefined}
        {...inputProps}
      />
      {hint && <FieldDescription id={hintId}>{hint}</FieldDescription>}
      {message && <FieldError id={messageId}>{message}</FieldError>}
    </Field>
  );
}
