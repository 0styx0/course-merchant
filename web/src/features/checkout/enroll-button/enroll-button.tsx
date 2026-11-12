"use client";

import { useState } from "react";
import type { CheckoutCustomer } from "@/lib/types";
import { AfterEnrollNote } from "./after-enroll-note";
import { ClosedEnrollButton } from "./closed-enroll-button/closed-enroll-button";
import { EnrollForm } from "./enroll-form";
import { makeEnrollWords } from "./enroll-words";

type EnrollButtonProps = {
  courseId: string;
  /** The formatted price of a paid course; absent for a free course. */
  priceLabel?: string;
};

/** Shows one button; pressing it opens the name and email fields in place. */
export function EnrollButton({ courseId, priceLabel }: EnrollButtonProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  // A new key remounts the form, which drops React's frozen pending send.
  const [restartCount, setRestartCount] = useState(0);
  const [typedCustomer, setTypedCustomer] = useState<CheckoutCustomer>();
  const words = makeEnrollWords(priceLabel);
  const isPaid = priceLabel !== undefined;

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
        isPaid={isPaid}
        startCustomer={typedCustomer}
        onRestoredFromCache={restartWithCustomer}
      />
    );
  }

  return (
    <ClosedEnrollButton
      label={words.open}
      onOpen={() => setIsFormOpen(true)}
      note={<AfterEnrollNote isPaid={isPaid} />}
    />
  );
}
