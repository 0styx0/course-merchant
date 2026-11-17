"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import type { AdminCourse, ProblemDetails } from "@/lib/types";

import { UnenrollDialog } from "./unenroll-dialog";
import { unenrollStudentAction } from "./unenroll-student.action";

type Enrollment = AdminCourse["enrollments"][number];
type ShownProblem = Pick<ProblemDetails, "title" | "detail">;

// Shown when the call never got an answer, so there are no API words to show.
const unenrollThrewProblem: ShownProblem = {
  title: "Couldn't un-enroll the student",
  detail:
    "Something went wrong while un-enrolling. Check your connection and try again.",
};

/** The API's refusal, or the fixed words when the call threw. */
async function unenrollProblemOrNull(courseId: string, customerId: string) {
  try {
    const result = await unenrollStudentAction(courseId, customerId);
    return result.state === "failure" ? result.error : null;
  } catch {
    return unenrollThrewProblem;
  }
}

/**
 * Runs the un-enroll as a transition, so `isPending` stays true until the
 * page the action re-rendered has arrived and the row shows the change.
 */
function useUnenrollStudent(courseId: string, customerId: string) {
  const [isPending, startTransition] = useTransition();
  const [problem, setProblem] = useState<ShownProblem | null>(null);

  function unenrollStudent(onSuccess: () => void) {
    setProblem(null);
    startTransition(async () => {
      const problemToShow = await unenrollProblemOrNull(courseId, customerId);
      // State set after an await needs its own transition (React's useTransition docs).
      startTransition(() =>
        problemToShow === null ? onSuccess() : setProblem(problemToShow),
      );
    });
  }

  return {
    isPending,
    problem,
    unenrollStudent,
    clearProblem: () => setProblem(null),
  };
}

type UnenrollButtonProps = {
  courseId: string;
  enrollment: Enrollment;
};

/**
 * The Un-enroll button and its confirm dialog. An un-enrolled student has no
 * button, so the table and the cards share that rule.
 */
export function UnenrollButton({ courseId, enrollment }: UnenrollButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const unenroll = useUnenrollStudent(courseId, enrollment.customer.id);
  if (enrollment.revokedAt !== null) return null;

  function openDialog() {
    unenroll.clearProblem();
    setIsOpen(true);
  }
  const studentName = enrollment.customer.name;
  return (
    <>
      <Button
        variant="outline"
        className="w-full md:w-auto"
        aria-label={`Un-enroll ${studentName}`}
        onClick={openDialog}
      >
        Un-enroll
      </Button>
      <UnenrollDialog
        studentName={studentName}
        isPaid={enrollment.payment !== null}
        isOpen={isOpen}
        isPending={unenroll.isPending}
        problem={unenroll.problem}
        onKeepStudent={() => setIsOpen(false)}
        onConfirm={() => unenroll.unenrollStudent(() => setIsOpen(false))}
      />
    </>
  );
}
