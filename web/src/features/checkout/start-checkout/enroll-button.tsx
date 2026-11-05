"use client";

import { LoaderCircle } from "lucide-react";
import {
  useActionState,
  type FormEvent,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from "react";
import { ProblemAlert } from "@/components/problem-alert";
import { Button } from "@/components/ui/button";
import type { FormFieldError } from "@/lib/api/form-errors";
import type { CheckoutCustomer } from "@/lib/types";
import { CheckEmailNotice } from "./check-email-notice";
import { findCheckoutCustomerErrors } from "./form/checkout-customer.schema";
import { CustomerDetailFields } from "./form/customer-detail-fields";
import { readCheckoutCustomer } from "./form/read-checkout-customer";
import { useFocusFirstInvalidField } from "./form/use-focus-first-invalid-field";
import { usePageRestoredFromCache } from "./use-page-restored-from-cache";
import {
  startCheckoutAction,
  type StartCheckoutFormState,
} from "./start-checkout.action";

type EnrollButtonProps = {
  courseId: string;
  /** The formatted price of a paid course; absent for a free course. */
  priceLabel?: string;
};

type EnrollWords = {
  open: string;
  send: string;
  sending: string;
  /** The send label after a failure a second press can fix; absent for a free course. */
  retry?: string;
};

function makeEnrollWords(priceLabel: string | undefined): EnrollWords {
  if (priceLabel === undefined) {
    return {
      open: "Enroll for free",
      send: "Email me the link",
      sending: "Sending…",
    };
  }
  return {
    open: `Enroll for ${priceLabel}`,
    send: "Continue to payment",
    sending: "Opening payment…",
    retry: "Try again",
  };
}

const RETRYABLE_PROBLEM_CODES = new Set([
  "PAYMENT_PROVIDER_UNAVAILABLE",
  "INTERNAL_SERVER_ERROR",
  "API_UNREACHABLE",
]);

function isRetryableProblemCode(problemCode: string | undefined): boolean {
  return problemCode !== undefined && RETRYABLE_PROBLEM_CODES.has(problemCode);
}

function chooseSendLabel(
  words: EnrollWords,
  failedProblemCode: string | undefined,
): string {
  if (words.retry && isRetryableProblemCode(failedProblemCode)) {
    return words.retry;
  }
  return words.send;
}

const EMPTY_FORM_STATE: StartCheckoutFormState = { state: "empty" };
const NO_FIELD_ERRORS: FormFieldError[] = [];

/** Shows one button; pressing it opens the name and email fields in place. */
export function EnrollButton({ courseId, priceLabel }: EnrollButtonProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  // A new key remounts the form, which drops React's frozen pending send.
  const [restartCount, setRestartCount] = useState(0);
  const [typedCustomer, setTypedCustomer] = useState<CheckoutCustomer>();
  const words = makeEnrollWords(priceLabel);

  function restartWithCustomer(customer: CheckoutCustomer) {
    setTypedCustomer(customer);
    setRestartCount((count) => count + 1);
  }

  if (isFormOpen) {
    return (
      <EnrollForm
        key={restartCount}
        courseId={courseId}
        words={words}
        startCustomer={typedCustomer}
        onRestoredFromCache={restartWithCustomer}
      />
    );
  }

  return (
    <Button
      type="button"
      aria-expanded={false}
      className="mt-6"
      onClick={() => setIsFormOpen(true)}
    >
      {words.open} <span aria-hidden="true">→</span>
    </Button>
  );
}

type EnrollFormProps = {
  courseId: string;
  words: EnrollWords;
  /** The values to show in the boxes until a failed send hands back its own. */
  startCustomer: CheckoutCustomer | undefined;
  onRestoredFromCache: (typedCustomer: CheckoutCustomer) => void;
};

/** The browser's messages win over the API's, because they show at once. */
function chooseFieldErrors(
  browserErrors: FormFieldError[],
  state: StartCheckoutFormState,
): FormFieldError[] {
  if (browserErrors.length > 0) return browserErrors;
  return state.state === "failure" ? state.fieldErrors : NO_FIELD_ERRORS;
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

function EnrollForm({
  courseId,
  words,
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
  const fieldErrors = chooseFieldErrors(browserErrors, state);
  useFocusFirstInvalidField(formRef, fieldErrors);
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
    <form
      ref={formRef}
      noValidate
      action={sendAction}
      onSubmit={checkTypedDetailsBeforeSending}
      className="mt-6 space-y-4"
    >
      {state.state === "failure" && <ProblemAlert problem={state.problem} />}
      <CustomerDetailFields
        customer={state.state === "failure" ? state.customer : startCustomer}
        // Sending again clears the old messages.
        fieldErrors={isPending ? NO_FIELD_ERRORS : fieldErrors}
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
  );
}

function FocusedCheckEmailNotice({ email }: { email: string }) {
  const noticeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    noticeRef.current?.focus();
  }, []);

  return (
    <div className="mt-6">
      <CheckEmailNotice ref={noticeRef} email={email} />
    </div>
  );
}

function SendButton({
  words,
  failedProblemCode,
  isPending,
}: {
  words: EnrollWords;
  failedProblemCode: string | undefined;
  isPending: boolean;
}) {
  // Not disabled: a disabled button drops the keyboard focus.
  return (
    <Button type="submit" aria-busy={isPending}>
      {isPending ? (
        <>
          <LoaderCircle aria-hidden="true" className="animate-spin" />
          {words.sending}
        </>
      ) : (
        <>
          {chooseSendLabel(words, failedProblemCode)}{" "}
          <span aria-hidden="true">→</span>
        </>
      )}
    </Button>
  );
}
