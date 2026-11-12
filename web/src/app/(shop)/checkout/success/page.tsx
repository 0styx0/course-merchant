import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProblemAlert } from "@/components/problem-alert";
import { CheckoutStatusMessage } from "@/features/checkout/success-page/checkout-status-message";
import { getCheckoutStatusTitle } from "@/features/checkout/success-page/checkout-status-title";
import {
  getCheckoutStatus,
  type GetCheckoutStatusResult,
} from "@/features/checkout/success-page/checkout-status.api";

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

function isCheckoutNotFound(result: GetCheckoutStatusResult): boolean {
  return (
    result.state === "failure" && result.error.code === "CHECKOUT_NOT_FOUND"
  );
}

async function readTabTitle(checkoutId: string | undefined): Promise<string> {
  if (checkoutId === undefined) {
    return "Checkout not found";
  }
  const result = await getCheckoutStatus(checkoutId);
  if (isCheckoutNotFound(result)) {
    return "Checkout not found";
  }
  // The page itself shows the API's failure, so its tab keeps the thanks.
  return result.state === "success"
    ? getCheckoutStatusTitle(result.data.status)
    : "Thank you";
}

// A not-found page's own metadata never reaches the tab, so the page names the
// tab for every outcome.
export async function generateMetadata({
  searchParams,
}: CheckoutSuccessPageProps): Promise<Metadata> {
  const checkoutId = readCheckoutId((await searchParams).checkoutId);
  return {
    title: await readTabTitle(checkoutId),
    robots: { index: false },
  };
}

async function CheckoutReturn({ checkoutId }: { checkoutId: string }) {
  const result = await getCheckoutStatus(checkoutId);

  if (isCheckoutNotFound(result)) {
    notFound();
  }

  if (result.state === "failure") {
    return <ProblemAlert problem={result.error} />;
  }

  return (
    <CheckoutStatusMessage
      status={result.data.status}
      courseId={result.data.courseId}
    />
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
