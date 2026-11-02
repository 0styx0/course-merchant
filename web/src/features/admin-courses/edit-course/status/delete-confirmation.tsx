"use client";

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

export type DeleteConfirmationProps = {
  open: boolean;
  /** Runs on "Keep the course" and on Escape. */
  onKeepCourse: () => void;
  onConfirmDelete: () => void;
};

/** Asks the admin to confirm deleting the course before the save runs. */
export function DeleteConfirmation({
  open,
  onKeepCourse,
  onConfirmDelete,
}: DeleteConfirmationProps) {
  function keepCourseWhenClosed(nextOpen: boolean) {
    if (!nextOpen) onKeepCourse();
  }
  return (
    <AlertDialog open={open} onOpenChange={keepCourseWhenClosed}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this course?</AlertDialogTitle>
          <AlertDialogDescription>
            It leaves the admin list, and students can no longer find or buy it.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep the course</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirmDelete}>
            Delete course
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
