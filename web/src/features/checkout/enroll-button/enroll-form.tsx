import {
  useActionState,
  type FormEvent,
  type RefObject,
  useRef,
  useState,
} from "react";
import { ProblemAlert } from "@/components/problem-alert";
import type { FormFieldError } from "@/lib/api/form-errors";
import type { CheckoutCustomer } from "@/lib/types";
import { AfterEnrollNote } from "./after-enroll-note";
import { FocusedCheckEmailNotice } from "../check-email-notice/focused-check-email-notice";
import { findCheckoutCustomerErrors } from "../form/checkout-customer.schema";
import { CustomerDetailFields } from "../form/customer-detail-fields";
import { readCheckoutCustomer } from "../form/read-checkout-customer";
import { useFocusFirstInvalidField } from "../form/use-focus-first-invalid-field";
import { usePageRestoredFromCache } from "./use-page-restored-from-cache";
import { useRecheckedFieldErrors } from "./use-rechecked-field-errors";
import { SendButton } from "./send-button";
import type { EnrollWords } from "./enroll-words";
import {
  startCheckoutAction,
  type StartCheckoutFormState,
} from "../start-checkout/start-checkout.action";

type EnrollFormProps = {
  courseId: string;
  words: EnrollWords;
  isPaid: boolean;
  /** The values to show in the boxes until a failed send hands back its own. */
  startCustomer: CheckoutCustomer | undefined;
  onRestoredFromCache: (typedCustomer: CheckoutCustomer) => void;
};

const EMPTY_FORM_STATE: StartCheckoutFormState = { state: "empty" };
const NO_FIELD_ERRORS: FormFieldError[] = [];

/** The browser's messages win over the API's, because they show at once. */
function chooseFieldErrors(
  browserErrors: FormFieldError[],
  state: StartCheckoutFormState,
): FormFieldError[] {
  if (browserErrors.length > 0) return browserErrors;
  return state.state === "failure" ? state.fieldErrors : NO_FIELD_ERRORS;
}

/** Focuses the first wrong box after a send, then keeps the shown messages current as the visitor edits. */
function useFieldErrorsAfterSend(
  formRef: RefObject<HTMLFormElement | null>,
  errorsAtSend: FormFieldError[],
) {
  // Focus follows the list from the send, so editing one box never moves it.
  useFocusFirstInvalidField(formRef, errorsAtSend);
  return useRecheckedFieldErrors(errorsAtSend);
}

/** On a cache restore, hands the caller the values typed in the form. */
function useReportTypedCustomerOnRestore(
  formRef: RefObject<HTMLFormElement | null>,
  onRestoredFromCache: (typedCustomer: CheckoutCustomer) => void,
) {
  usePageRestoredFromCache(() => {
    if (formRef.current) {
      onRestoredFromCache(readCheckoutCustomer(new FormData(formRef.current)));
    }
  });
}

export function EnrollForm({
  courseId,
  words,
  isPaid,
  startCustomer,
  onRestoredFromCache,
}: EnrollFormProps) {
  const [state, sendAction, isPending] = useActionState(
    startCheckoutAction.bind(null, courseId),
    EMPTY_FORM_STATE,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [browserErrors, setBrowserErrors] =
    useState<FormFieldError[]>(NO_FIELD_ERRORS);
  const errorsAtSend = chooseFieldErrors(browserErrors, state);
  const { shownErrors, recheckEditedBox } = useFieldErrorsAfterSend(
    formRef,
    errorsAtSend,
  );
  useReportTypedCustomerOnRestore(formRef, onRestoredFromCache);

  function checkTypedDetailsBeforeSending(event: FormEvent<HTMLFormElement>) {
    // A second press while sending would start a second checkout.
    if (isPending) {
      event.preventDefault();
      return;
    }
    const errors = findCheckoutCustomerErrors(
      readCheckoutCustomer(new FormData(event.currentTarget)),
    );
    setBrowserErrors(errors);
    // Stopping the submit sends nothing and keeps React 19 from clearing the typed values.
    if (errors.length > 0) event.preventDefault();
  }

  if (state.state === "success") {
    return <FocusedCheckEmailNotice email={state.customer.email} />;
  }

  return (
    <>
      <form
        ref={formRef}
        noValidate
        action={sendAction}
        onSubmit={checkTypedDetailsBeforeSending}
        onInput={recheckEditedBox}
        className="mt-6 space-y-4"
      >
        {state.state === "failure" && <ProblemAlert problem={state.problem} />}
        <CustomerDetailFields
          customer={state.state === "failure" ? state.customer : startCustomer}
          // Sending again clears the old messages.
          fieldErrors={isPending ? NO_FIELD_ERRORS : shownErrors}
          isPending={isPending}
        />
        <SendButton
          words={words}
          failedProblemCode={
            state.state === "failure" ? state.problem.code : undefined
          }
          isPending={isPending}
        />
      </form>
      <AfterEnrollNote isPaid={isPaid} />
    </>
  );
}
