"use client";

import { LoaderCircle } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { ProblemAlert } from "@/components/problem-alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { CheckEmailNotice } from "./check-email-notice";
import {
  startCheckoutAction,
  type StartCheckoutFormState,
} from "./start-checkout.action";

type EnrollButtonProps = {
  courseId: string;
};

type CustomerDetailFieldsProps = {
  state: StartCheckoutFormState;
  isPending: boolean;
};

const EMPTY_FORM_STATE: StartCheckoutFormState = { state: "empty" };

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

  if (state.state === "success") {
    return <FocusedCheckEmailNotice email={state.customer.email} />;
  }

  return (
    <form
      action={sendAction}
      // A second press while sending would start a second checkout.
      onSubmit={(event) => {
        if (isPending) event.preventDefault();
      }}
      className="mt-6 space-y-4"
    >
      {state.state === "failure" && <ProblemAlert problem={state.problem} />}
      <CustomerDetailFields state={state} isPending={isPending} />
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

function CustomerDetailFields({ state, isPending }: CustomerDetailFieldsProps) {
  const nameInputRef = useRef<HTMLInputElement>(null);
  // React 19 resets uncontrolled fields after every action, so a failure
  // hands the typed values back as the new defaults.
  const customer = state.state === "failure" ? state.customer : undefined;

  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="enroll-name">Name</FieldLabel>
        <Input
          ref={nameInputRef}
          id="enroll-name"
          name="customer.name"
          autoComplete="name"
          defaultValue={customer?.name}
          readOnly={isPending}
          required
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="enroll-email">Email</FieldLabel>
        <Input
          id="enroll-email"
          name="customer.email"
          type="email"
          autoComplete="email"
          defaultValue={customer?.email}
          readOnly={isPending}
          aria-describedby="enroll-email-hint"
          required
        />
        <FieldDescription id="enroll-email-hint">
          We send the course link to this address.
        </FieldDescription>
      </Field>
    </FieldGroup>
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
