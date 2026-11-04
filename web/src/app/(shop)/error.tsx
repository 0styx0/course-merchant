"use client"; // Error boundaries must be Client Components

import { ProblemAlert } from "@/components/problem-alert";
import { Button } from "@/components/ui/button";

type ErrorPageProps = {
  error: Error & { digest?: string };
  retry: () => void;
};

// Shows no error text: in production Next only sends a digest, and the
// details are in the server logs.
export default function ErrorPage({ retry }: ErrorPageProps) {
  return (
    <>
      <ProblemAlert
        problem={{
          title: "We couldn't load this page",
          detail: "Please try again in a moment.",
        }}
      />
      <Button type="button" onClick={() => retry()} className="mt-4">
        Try again
      </Button>
    </>
  );
}
