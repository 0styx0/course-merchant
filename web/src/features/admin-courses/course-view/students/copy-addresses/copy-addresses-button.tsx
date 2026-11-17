"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

type CopyAddressesButtonProps = {
  emails: string[];
};

/** "all" stays even for one, so the admin knows the copy took everyone. */
function copiedNote(addressCount: number) {
  return addressCount === 1
    ? "Copied all 1 active student's address."
    : `Copied all ${addressCount} active students' addresses.`;
}

/** Copies the email addresses, comma-separated, to the clipboard and says how many. */
export function CopyAddressesButton({ emails }: CopyAddressesButtonProps) {
  const [note, setNote] = useState<string | null>(null);

  async function copyAddresses() {
    await navigator.clipboard.writeText(emails.join(", "));
    setNote(copiedNote(emails.length));
  }

  return (
    <div className="flex flex-col gap-1 md:items-end">
      <Button
        variant="outline"
        className="w-full md:w-auto"
        onClick={copyAddresses}
      >
        Copy active students&apos; addresses
      </Button>
      {note !== null && (
        <p role="status" className="text-sm text-muted-foreground">
          {note}
        </p>
      )}
    </div>
  );
}
