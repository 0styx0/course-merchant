import Link from "next/link";

import { GhostArrowLink } from "@/components/ghost-arrow-link";
import { buttonVariants } from "@/components/ui/button";
import { CheckEmailNotice } from "@/features/checkout/check-email-notice/check-email-notice";
import { shopCoursePath } from "@/features/courses/shop-course-path";
import type { CheckoutStatus } from "@/lib/types";
import { getCheckoutStatusTitle } from "./checkout-status-title";
import { PendingCheckoutNotice } from "./pending-checkout-notice";

type CheckoutStatusMessageProps = {
  status: CheckoutStatus["status"];
  courseId: string;
};

const ENDED_CHECKOUT_WORDS = {
  expired: "This checkout ended before payment, so we charged you nothing.",
  refunded:
    "We've refunded this payment. It can take a few days to appear on your statement.",
} as const;

function TryAgainLink({ courseId }: { courseId: string }) {
  return (
    <Link
      href={shopCoursePath(courseId)}
      className={buttonVariants({ className: "mt-4" })}
    >
      Try again →
    </Link>
  );
}

function BackToCourseLink({ courseId }: { courseId: string }) {
  return (
    <GhostArrowLink href={shopCoursePath(courseId)} className="mt-4">
      Back to the course →
    </GhostArrowLink>
  );
}

function EndedCheckoutWords({
  status,
  courseId,
}: {
  status: "expired" | "refunded";
  courseId: string;
}) {
  const sentence = ENDED_CHECKOUT_WORDS[status];

  return (
    <>
      <h1 className="font-heading text-h2 md:text-h1">
        {getCheckoutStatusTitle(status)}.
      </h1>
      <p role="status" className="mt-4 text-muted-foreground">
        {sentence}
      </p>
      {status === "expired" ? (
        <TryAgainLink courseId={courseId} />
      ) : (
        <BackToCourseLink courseId={courseId} />
      )}
    </>
  );
}

function ThankYouWords({ status }: { status: "succeeded" | "pending" }) {
  return (
    <>
      <h1 className="font-heading text-h2 md:text-h1">
        {getCheckoutStatusTitle(status)}.
      </h1>
      <div className="mt-4">
        {status === "succeeded" ? (
          <CheckEmailNotice />
        ) : (
          <PendingCheckoutNotice />
        )}
      </div>
    </>
  );
}

/** The heading and words a buyer reads on the return page for one checkout status. */
export function CheckoutStatusMessage({
  status,
  courseId,
}: CheckoutStatusMessageProps) {
  if (status === "expired" || status === "refunded") {
    return <EndedCheckoutWords status={status} courseId={courseId} />;
  }

  return <ThankYouWords status={status} />;
}
