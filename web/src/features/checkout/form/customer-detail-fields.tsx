import { useEffect, useRef } from "react";
import { FieldGroup } from "@/components/ui/field";
import type { FormFieldError } from "@/lib/api/form-errors";
import type { CheckoutCustomer } from "@/lib/types";
import { CheckoutTextField } from "./checkout-text-field";

type CustomerDetailFieldsProps = {
  /** The values to show again after a failed send. */
  customer: CheckoutCustomer | undefined;
  fieldErrors: FormFieldError[];
  isPending: boolean;
};

function findFieldMessage(fieldErrors: FormFieldError[], path: string) {
  return fieldErrors.find((fieldError) => fieldError.path === path)?.message;
}

/** The Name and Email boxes of the enroll form, with the API's message under each wrong one. */
export function CustomerDetailFields({
  customer,
  fieldErrors,
  isPending,
}: CustomerDetailFieldsProps) {
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  // React 19 resets uncontrolled fields after every action, so a failure
  // hands the typed values back as the new defaults.
  return (
    <FieldGroup>
      <CheckoutTextField
        ref={nameInputRef}
        id="enroll-name"
        label="Name"
        name="customer.name"
        autoComplete="name"
        defaultValue={customer?.name}
        readOnly={isPending}
        message={findFieldMessage(fieldErrors, "customer.name")}
      />
      <CheckoutTextField
        id="enroll-email"
        label="Email"
        name="customer.email"
        type="email"
        autoComplete="email"
        defaultValue={customer?.email}
        readOnly={isPending}
        hint="We send the course link to this address."
        message={findFieldMessage(fieldErrors, "customer.email")}
      />
    </FieldGroup>
  );
}
