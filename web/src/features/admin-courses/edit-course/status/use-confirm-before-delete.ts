import { useState } from "react";

import type { EditCourseFormValues } from "../../validation/edit-course-form-schema";
import type { DeleteConfirmationProps } from "./delete-confirmation";

type CourseStatusName = EditCourseFormValues["status"];

/** True when the save would delete a course that wasn't loaded as deleted. */
function needsDeleteConfirmation(
  values: EditCourseFormValues,
  loadedStatus: CourseStatusName,
) {
  return values.status === "deleted" && loadedStatus !== "deleted";
}

/**
 * Wraps the save so choosing Deleted asks first. The checked values wait
 * while the dialog is open; Delete saves them, Keep drops them.
 */
export function useConfirmBeforeDelete(
  save: (values: EditCourseFormValues) => Promise<void>,
  loadedStatus: CourseStatusName,
) {
  const [heldValues, setHeldValues] = useState<EditCourseFormValues | null>(
    null,
  );
  const [isConfirmedSaveRunning, setIsConfirmedSaveRunning] = useState(false);

  function saveOrAskToDelete(values: EditCourseFormValues) {
    if (needsDeleteConfirmation(values, loadedStatus)) {
      setHeldValues(values);
      return;
    }
    return save(values);
  }

  async function confirmDelete() {
    if (heldValues === null) return;
    setHeldValues(null);
    setIsConfirmedSaveRunning(true);
    try {
      await save(heldValues);
    } finally {
      setIsConfirmedSaveRunning(false);
    }
  }

  const deleteConfirmation: DeleteConfirmationProps = {
    open: heldValues !== null,
    onKeepCourse: () => setHeldValues(null),
    onConfirmDelete: () => void confirmDelete(),
  };
  return { saveOrAskToDelete, deleteConfirmation, isConfirmedSaveRunning };
}
