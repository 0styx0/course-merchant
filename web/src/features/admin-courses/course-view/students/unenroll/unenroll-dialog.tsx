"use client";

import { ProblemAlert } from "@/components/problem-alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { ProblemDetails } from "@/lib/types";

export type UnenrollDialogProps = {
  studentName: string;
  /** True when the student paid, so the dialog asks for a Stripe refund first. */
  isPaid: boolean;
  isOpen: boolean;
  /** True while the un-enroll runs; the dialog then stays open and locked. */
  isPending: boolean;
  problem: Pick<ProblemDetails, "title" | "detail"> | null;
  /** Runs on "Keep student" and on Escape or an outside click. */
  onKeepStudent: () => void;
  onConfirm: () => void;
};

const accessEndsWords = "Un-enrolling removes their access to the course.";

// The app never contacts Stripe, so a paid student's refund is the admin's job.
const refundFirstWords =
  "Refund their payment in Stripe first. Un-enrolling removes their access to the course and marks the payment Refunded; it doesn't contact Stripe.";

/** Asks the admin to confirm un-enrolling one student, and shows why it failed. */
export function UnenrollDialog({
  studentName,
  isPaid,
  isOpen,
  isPending,
  problem,
  onKeepStudent,
  onConfirm,
}: UnenrollDialogProps) {
  // A running un-enroll keeps the dialog open, so its outcome stays in view.
  function keepStudentWhenClosed(isNowOpen: boolean) {
    if (!isNowOpen && !isPending) onKeepStudent();
  }
  return (
    <AlertDialog open={isOpen} onOpenChange={keepStudentWhenClosed}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Un-enroll {studentName}?</AlertDialogTitle>
          <AlertDialogDescription>
            {isPaid ? refundFirstWords : accessEndsWords}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {problem !== null && <ProblemAlert problem={problem} />}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>
            Keep student
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isPending}
            onClick={onConfirm}
          >
            {isPending ? "Un-enrolling…" : "Un-enroll"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
