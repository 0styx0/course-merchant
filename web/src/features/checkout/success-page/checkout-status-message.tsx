import { LoaderCircle } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { CheckEmailNotice } from "@/features/checkout/check-email-notice/check-email-notice";
import type { CheckoutStatus } from "@/lib/types";

type CheckoutStatusMessageProps = {
  status: CheckoutStatus["status"];
};

const ENDED_CHECKOUT_WORDS = {
  expired: {
    heading: "Checkout timed out.",
    sentence: "This checkout ended before payment, so we charged you nothing.",
  },
  refunded: {
    heading: "Payment refunded.",
    sentence:
      "We've refunded this payment. It can take a few days to appear on your statement.",
  },
} as const;

function ConfirmingLine() {
  return (
    <p role="status" className="flex gap-2 text-muted-foreground">
      <LoaderCircle
        aria-hidden="true"
        className="mt-0.5 size-5 shrink-0 motion-safe:animate-spin"
      />
      We&apos;re confirming your payment.
    </p>
  );
}

function ReturnLink() {
  return (
    <Link
      href="/"
      className={buttonVariants({ variant: "ghost", className: "mt-4" })}
    >
      See current courses →
    </Link>
  );
}

function EndedCheckoutWords({ status }: { status: "expired" | "refunded" }) {
  const { heading, sentence } = ENDED_CHECKOUT_WORDS[status];

  return (
    <>
      <h1 className="font-heading text-h2 md:text-h1">{heading}</h1>
      <p role="status" className="mt-4 text-muted-foreground">
        {sentence}
      </p>
      <ReturnLink />
    </>
  );
}

function ThankYouWords({ status }: { status: "succeeded" | "pending" }) {
  return (
    <>
      <h1 className="font-heading text-h2 md:text-h1">Thank you.</h1>
      <div className="mt-4">
        {status === "succeeded" ? <CheckEmailNotice /> : <ConfirmingLine />}
      </div>
    </>
  );
}

/** The heading and words a buyer reads on the return page for one checkout status. */
export function CheckoutStatusMessage({ status }: CheckoutStatusMessageProps) {
  if (status === "expired" || status === "refunded") {
    return <EndedCheckoutWords status={status} />;
  }

  return <ThankYouWords status={status} />;
}
