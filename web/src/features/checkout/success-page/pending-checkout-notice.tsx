"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const RECHECK_EVERY_MS = 5000;
const GIVE_UP_AFTER_MS = 60_000;

function ConfirmingLine() {
  return (
    <p role="status" className="flex gap-2 text-muted-foreground">
      <LoaderCircle
        aria-hidden="true"
        className="mt-0.5 size-5 shrink-0 motion-safe:animate-spin"
      />
      <span>
        We&apos;re confirming your payment. This page updates by itself.
      </span>
    </p>
  );
}

function ReceivedPaymentLine() {
  return (
    <p role="status" className="text-muted-foreground">
      We&apos;ve received your payment. Your access email can take a few
      minutes. If it hasn&apos;t arrived, look in spam, or reload this page to
      check again.
    </p>
  );
}

/** Re-asks the server for the checkout status until its status changes or a minute passes. */
function useRecheckUntilGivenUp() {
  const router = useRouter();
  const [hasGivenUp, setHasGivenUp] = useState(false);

  useEffect(() => {
    const recheckTimer = setInterval(router.refresh, RECHECK_EVERY_MS);
    const giveUpTimer = setTimeout(() => {
      clearInterval(recheckTimer);
      setHasGivenUp(true);
    }, GIVE_UP_AFTER_MS);

    return () => {
      clearInterval(recheckTimer);
      clearTimeout(giveUpTimer);
    };
  }, [router]);

  return hasGivenUp;
}

/** The line a buyer reads while the server has not yet heard the payment result from Stripe. */
export function PendingCheckoutNotice() {
  const hasGivenUp = useRecheckUntilGivenUp();

  return hasGivenUp ? <ReceivedPaymentLine /> : <ConfirmingLine />;
}
