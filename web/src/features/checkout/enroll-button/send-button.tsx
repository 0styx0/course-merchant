import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isRetryableProblemCode, type EnrollWords } from "./enroll-words";

function chooseSendLabel(
  words: EnrollWords,
  failedProblemCode: string | undefined,
): string {
  if (words.retry && isRetryableProblemCode(failedProblemCode)) {
    return words.retry;
  }
  return words.send;
}

export function SendButton({
  words,
  failedProblemCode,
  isPending,
}: {
  words: EnrollWords;
  failedProblemCode: string | undefined;
  isPending: boolean;
}) {
  // Not disabled: a disabled button drops the keyboard focus.
  return (
    <Button type="submit" aria-busy={isPending} className="w-full">
      {isPending ? (
        <>
          <LoaderCircle aria-hidden="true" className="animate-spin" />
          {words.sending}
        </>
      ) : (
        <>
          {chooseSendLabel(words, failedProblemCode)}{" "}
          <span aria-hidden="true">→</span>
        </>
      )}
    </Button>
  );
}
