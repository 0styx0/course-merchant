import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProblemAlert } from "@/components/problem-alert";
import { CheckEmailNotice } from "@/features/checkout/check-email-notice/check-email-notice";
import { getCheckoutStatus } from "@/features/checkout/success-page/checkout-status.api";

export const metadata: Metadata = {
  title: "Thank you",
  robots: { index: false },
};

type CheckoutSuccessPageProps = {
  searchParams: Promise<{ checkoutId?: string | string[] }>;
};

// URL parsing reads these two as folders, so the status call would reach
// another API address.
const FOLDER_NAMES = [".", ".."];

/**
 * A missing, empty or repeated `checkoutId`, or a folder name, gives
 * undefined.
 */
function readCheckoutId(
  checkoutId: string | string[] | undefined,
): string | undefined {
  return typeof checkoutId === "string" &&
    checkoutId !== "" &&
    !FOLDER_NAMES.includes(checkoutId)
    ? checkoutId
    : undefined;
}

async function CheckoutReturn({ checkoutId }: { checkoutId: string }) {
  const result = await getCheckoutStatus(checkoutId);

  if (
    result.state === "failure" &&
    result.error.code === "CHECKOUT_NOT_FOUND"
  ) {
    notFound();
  }

  if (result.state === "failure") {
    return <ProblemAlert problem={result.error} />;
  }

  return (
    <>
      <h1 className="font-heading text-h2 md:text-h1">Thank you.</h1>
      <div className="mt-4">
        {result.data.status === "succeeded" ? (
          <CheckEmailNotice />
        ) : (
          <p className="text-muted-foreground">
            We&apos;re confirming your payment.
          </p>
        )}
      </div>
    </>
  );
}

export default async function CheckoutSuccessPage({
  searchParams,
}: CheckoutSuccessPageProps) {
  const checkoutId = readCheckoutId((await searchParams).checkoutId);

  if (checkoutId === undefined) {
    notFound();
  }

  // Called as a function, not rendered as <CheckoutReturn />, so a not-found
  // or a thrown status call ends this page's own render.
  return CheckoutReturn({ checkoutId });
}
