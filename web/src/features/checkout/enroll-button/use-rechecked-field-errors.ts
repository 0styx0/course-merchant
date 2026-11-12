import { useState, type FormEvent } from "react";
import type { FormFieldError } from "@/lib/api/form-errors";
import { findCheckoutCustomerErrors } from "../form/checkout-customer.schema";
import { readCheckoutCustomer } from "../form/read-checkout-customer";

/** The messages from re-checks of the errors of one send; `null` marks a box whose value now passes. */
type RecheckedMessages = {
  errorsAtSend: FormFieldError[];
  messageByPath: Record<string, string | null>;
};

function readEditedBoxPath(event: FormEvent<HTMLFormElement>): string {
  return event.target instanceof HTMLInputElement ? event.target.name : "";
}

function showRecheckedMessage(
  errorAtSend: FormFieldError,
  messageByPath: Record<string, string | null>,
): FormFieldError[] {
  if (!(errorAtSend.path in messageByPath)) return [errorAtSend];
  const message = messageByPath[errorAtSend.path];
  return message === null ? [] : [{ path: errorAtSend.path, message }];
}

/**
 * Keeps the messages from the last send current while the visitor edits the
 * boxes that had one. Returns the messages to show and the form's `onInput`
 * handler. A box without a message at the send stays quiet until the next send.
 */
export function useRecheckedFieldErrors(errorsAtSend: FormFieldError[]): {
  shownErrors: FormFieldError[];
  recheckEditedBox: (event: FormEvent<HTMLFormElement>) => void;
} {
  const [rechecked, setRechecked] = useState<RecheckedMessages>({
    errorsAtSend,
    messageByPath: {},
  });
  // A new send hands over a new list, which leaves the old re-checks behind.
  const messageByPath =
    rechecked.errorsAtSend === errorsAtSend ? rechecked.messageByPath : {};

  function recheckEditedBox(event: FormEvent<HTMLFormElement>) {
    const path = readEditedBoxPath(event);
    if (!errorsAtSend.some((errorAtSend) => errorAtSend.path === path)) return;
    const browserErrors = findCheckoutCustomerErrors(
      readCheckoutCustomer(new FormData(event.currentTarget)),
    );
    const message =
      browserErrors.find((browserError) => browserError.path === path)
        ?.message ?? null;
    setRechecked({
      errorsAtSend,
      messageByPath: { ...messageByPath, [path]: message },
    });
  }

  const shownErrors = errorsAtSend.flatMap((errorAtSend) =>
    showRecheckedMessage(errorAtSend, messageByPath),
  );
  return { shownErrors, recheckEditedBox };
}
