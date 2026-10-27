"use client"; // Error boundaries must be Client Components

import { Button } from "@/components/ui/button";

type ErrorPageProps = {
  error: Error & { digest?: string };
  retry: () => void;
};

// Shows no error text: in production Next only sends a digest, and the
// details are in the server logs.
export default function ErrorPage({ retry }: ErrorPageProps) {
  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div
        role="alert"
        className="rounded-md border border-red-300 bg-red-100 p-4 text-red-950"
      >
        <p className="font-semibold">We couldn&apos;t load this page</p>
        <p className="mt-1">Please try again in a moment.</p>
      </div>
      <Button type="button" onClick={() => retry()} className="mt-4">
        Try again
      </Button>
    </main>
  );
}
