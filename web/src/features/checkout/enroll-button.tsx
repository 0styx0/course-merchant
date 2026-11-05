"use client";

import { LoaderCircle } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { ProblemAlert } from "@/components/problem-alert";
import { Button } from "@/components/ui/button";
import type { FormFieldError } from "@/lib/api/form-errors";
import { CheckEmailNotice } from "./check-email-notice";
import { CustomerDetailFields } from "./form/customer-detail-fields";
import { useFocusFirstInvalidField } from "./form/use-focus-first-invalid-field";
import {
  startCheckoutAction,
  type StartCheckoutFormState,
} from "./start-checkout.action";

type EnrollButtonProps = {
  courseId: string;
};

const EMPTY_FORM_STATE: StartCheckoutFormState = { state: "empty" };
const NO_FIELD_ERRORS: FormFieldError[] = [];

/** Shows one button; pressing it opens the name and email fields in place. */
export function EnrollButton({ courseId }: EnrollButtonProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);

  if (isFormOpen) {
    return <EnrollForm courseId={courseId} />;
  }

  return (
    <Button
      type="button"
      aria-expanded={false}
      className="mt-6"
      onClick={() => setIsFormOpen(true)}
    >
      Enroll for free <span aria-hidden="true">→</span>
    </Button>
  );
}

function EnrollForm({ courseId }: EnrollButtonProps) {
  const [state, sendAction, isPending] = useActionState(
    startCheckoutAction.bind(null, courseId),
    EMPTY_FORM_STATE,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const fieldErrors =
    state.state === "failure" ? state.fieldErrors : NO_FIELD_ERRORS;
  useFocusFirstInvalidField(formRef, fieldErrors);

  if (state.state === "success") {
    return <FocusedCheckEmailNotice email={state.customer.email} />;
  }

  return (
    <form
      ref={formRef}
      noValidate
      action={sendAction}
      // A second press while sending would start a second checkout.
      onSubmit={(event) => {
        if (isPending) event.preventDefault();
      }}
      className="mt-6 space-y-4"
    >
      {state.state === "failure" && <ProblemAlert problem={state.problem} />}
      <CustomerDetailFields
        customer={state.state === "failure" ? state.customer : undefined}
        // Sending again clears the old messages.
        fieldErrors={isPending ? NO_FIELD_ERRORS : fieldErrors}
        isPending={isPending}
      />
      <SendButton isPending={isPending} />
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

function SendButton({ isPending }: { isPending: boolean }) {
  // Not disabled: a disabled button drops the keyboard focus.
  return (
    <Button type="submit" aria-busy={isPending}>
      {isPending ? (
        <>
          <LoaderCircle aria-hidden="true" className="animate-spin" />
          Sending…
        </>
      ) : (
        <>
          Email me the link <span aria-hidden="true">→</span>
        </>
      )}
    </Button>
  );
}
