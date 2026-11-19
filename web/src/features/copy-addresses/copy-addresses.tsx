"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

type CopyAddressesProps = {
  emails: string[];
};

/** "all" stays even for one, so the admin knows the copy took everyone. */
function copiedNote(addressCount: number) {
  return addressCount === 1
    ? "Copied all 1 active student's address."
    : `Copied all ${addressCount} active students' addresses.`;
}

const refusedCopyWords =
  "Couldn't copy the addresses. Your browser blocked the clipboard; click again or allow clipboard access.";

/** What the last click did: null before any click. */
type CopyOutcome = "copied" | "refused" | null;

/** Copies the email addresses, comma-separated, to the clipboard and says how many, or why it can't. */
export function CopyAddresses({ emails }: CopyAddressesProps) {
  const [copyOutcome, setCopyOutcome] = useState<CopyOutcome>(null);
  const hasNoActiveStudent = emails.length === 0;

  async function copyAddresses() {
    try {
      await navigator.clipboard.writeText(emails.join(", "));
      setCopyOutcome("copied");
    } catch {
      // A refused write rejects; a missing clipboard (plain http) throws a TypeError.
      setCopyOutcome("refused");
    }
  }

  return (
    <div className="flex flex-col gap-1 md:items-end">
      <Button
        variant="outline"
        className="w-full md:w-auto"
        disabled={hasNoActiveStudent}
        onClick={copyAddresses}
      >
        Copy active students&apos; addresses
      </Button>
      {hasNoActiveStudent && (
        <StatusNote noteText="No active students to copy." />
      )}
      {copyOutcome === "copied" && (
        <StatusNote noteText={copiedNote(emails.length)} />
      )}
      {copyOutcome === "refused" && (
        <p role="alert" className="text-sm text-destructive">
          {refusedCopyWords}
        </p>
      )}
    </div>
  );
}

/** A grey line that screen readers announce when it appears. */
function StatusNote({ noteText }: { noteText: string }) {
  return (
    <p role="status" className="text-sm text-muted-foreground">
      {noteText}
    </p>
  );
}
