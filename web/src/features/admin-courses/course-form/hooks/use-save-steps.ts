import { useRef, useState } from "react";
import type { FieldValues, UseFormSetError } from "react-hook-form";

import type { ChosenImage } from "../../image/course-image";
import type { CourseActionFailure } from "../../save-course/course-action-result";
import { uploadCourseImageAction } from "../../save-course/upload-image/upload-course-image.action";
import { useServerProblem, type ServerProblem } from "./use-server-problem";

/** The checked values of a form that holds a chosen image, or null for none. */
export type CheckedValuesWithImage = { image: ChosenImage | null };

/** Says the first step saved, then why the second step failed, with the API's reason. */
export function makeSecondStepFailedMessage(
  title: string,
  firstStepSavedWords: string,
  secondStepFailedWords: string,
  { problem }: CourseActionFailure,
): ServerProblem {
  return {
    title,
    detail: `${firstStepSavedWords}, but ${secondStepFailedWords}. ${problem.detail}`,
  };
}

/** Uploads the chosen image; no request when none is chosen. */
export async function uploadChosenImage(
  courseId: string,
  image: ChosenImage | null,
) {
  if (image === null) return undefined;
  const formData = new FormData();
  formData.set("image", image.file);
  return uploadCourseImageAction(courseId, formData);
}

/** Options a save hook passes to `useSaveSteps`. */
export type SaveStepsOptions = {
  /** The note shown before any save, e.g. "Saved as a draft" on arrival from create. */
  startingSavedNote?: string;
  /** The form's dirty state; the note goes when it turns on. */
  isDirty?: boolean;
};

/**
 * The saved note, and the step that sets it and then runs the caller's next
 * step. The note clears when the form turns dirty, not on a value change,
 * because a reset to the stored values also reports a value change.
 */
function useSavedNote({
  startingSavedNote,
  isDirty = false,
}: SaveStepsOptions) {
  const [savedNote, setSavedNote] = useState(startingSavedNote);
  const [wasDirty, setWasDirty] = useState(isDirty);

  // Clears during render, so the note never shows for a render after the
  // change (an effect would leave it up for one render).
  if (isDirty !== wasDirty) {
    setWasDirty(isDirty);
    if (isDirty) setSavedNote(undefined);
  }

  function markSaved() {
    setSavedNote("Saved");
  }

  function markSavedThen(goNext: () => void) {
    markSaved();
    goNext();
  }

  return { savedNote, markSaved, markSavedThen };
}

/** The note a thrown action adds once a step saved, e.g. " The image was saved." */
function useThrownStepNote() {
  const stepSavedNote = useRef<string>(undefined);

  return {
    noteStepSaved: (stepSavedWords: string) => {
      stepSavedNote.current = ` ${stepSavedWords}.`;
    },
    readStepSavedNote: () => stepSavedNote.current,
  };
}

/**
 * The parts every two-step save shares. Returns three things:
 * - `runSaveSteps` runs the steps and shows a message when an action throws;
 * - `stepReports` is what the steps call: `showRefusal`, `noteStepSaved`, `markSaved`, `markSavedThen`;
 * - `saveOutcome` is what the form reads: `savedNote`, `serverProblem`, `clearServerProblem`.
 */
export function useSaveSteps<TValues extends FieldValues>(
  setError: UseFormSetError<TValues>,
  options: SaveStepsOptions = {},
) {
  const { serverProblem, showRefusal, showThrownProblem, clearServerProblem } =
    useServerProblem(setError);
  const { savedNote, markSaved, markSavedThen } = useSavedNote(options);
  const { noteStepSaved, readStepSavedNote } = useThrownStepNote();

  async function runSaveSteps(saveSteps: () => Promise<void>) {
    clearServerProblem();
    try {
      await saveSteps();
    } catch {
      // A rejected Server Action throws instead of returning a failure.
      showThrownProblem(readStepSavedNote());
    }
  }

  return {
    runSaveSteps,
    stepReports: { showRefusal, noteStepSaved, markSaved, markSavedThen },
    saveOutcome: { savedNote, serverProblem, clearServerProblem },
  };
}

type SaveOutcome = ReturnType<typeof useSaveSteps>["saveOutcome"];

/** What a save hook gives its form: `save`, the saved note and whether one shows, and the message with its clearer. */
export function makeSaveHookResult<TChecked>(
  runSaveSteps: (saveSteps: () => Promise<void>) => Promise<void>,
  saveSteps: (values: TChecked) => Promise<void>,
  { savedNote, serverProblem, clearServerProblem }: SaveOutcome,
) {
  return {
    save: (values: TChecked) => runSaveSteps(() => saveSteps(values)),
    savedNote,
    isSaved: savedNote !== undefined,
    serverMessage: { serverProblem, clearServerProblem },
  };
}
