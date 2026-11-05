"use client";

import { LoaderCircle } from "lucide-react";
import {
  useActionState,
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { ProblemAlert } from "@/components/problem-alert";
import { Button } from "@/components/ui/button";
import type { FormFieldError } from "@/lib/api/form-errors";
import { CheckEmailNotice } from "./check-email-notice";
import { findCheckoutCustomerErrors } from "./form/checkout-customer.schema";
import { CustomerDetailFields } from "./form/customer-detail-fields";
import { readCheckoutCustomer } from "./form/read-checkout-customer";
import { useFocusFirstInvalidField } from "./form/use-focus-first-invalid-field";
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
  };
}

const EMPTY_FORM_STATE: StartCheckoutFormState = { state: "empty" };
const NO_FIELD_ERRORS: FormFieldError[] = [];

/** Shows one button; pressing it opens the name and email fields in place. */
export function EnrollButton({ courseId, priceLabel }: EnrollButtonProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const words = makeEnrollWords(priceLabel);

  if (isFormOpen) {
    return <EnrollForm courseId={courseId} words={words} />;
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
};

function EnrollForm({ courseId, words }: EnrollFormProps) {
  const [state, sendAction, isPending] = useActionState(
    startCheckoutAction.bind(null, courseId),
    EMPTY_FORM_STATE,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [browserErrors, setBrowserErrors] =
    useState<FormFieldError[]>(NO_FIELD_ERRORS);
  const serverErrors =
    state.state === "failure" ? state.fieldErrors : NO_FIELD_ERRORS;
  const fieldErrors = browserErrors.length > 0 ? browserErrors : serverErrors;
  useFocusFirstInvalidField(formRef, fieldErrors);

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
        customer={state.state === "failure" ? state.customer : undefined}
        // Sending again clears the old messages.
        fieldErrors={isPending ? NO_FIELD_ERRORS : fieldErrors}
        isPending={isPending}
      />
      <SendButton words={words} isPending={isPending} />
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
  isPending,
}: {
  words: EnrollWords;
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
          {words.send} <span aria-hidden="true">→</span>
        </>
      )}
    </Button>
  );
}
