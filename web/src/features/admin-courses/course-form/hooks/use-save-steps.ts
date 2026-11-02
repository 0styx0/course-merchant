import { useRouter } from "next/navigation";
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

/** The saved flag, and the step that sets it and goes to the home page. */
function useSavedFlagAndGoHome() {
  const router = useRouter();
  const [saved, setSaved] = useState(false);

  function goHomeAfterSave() {
    setSaved(true);
    router.push("/");
  }

  return { saved, goHomeAfterSave };
}

/** The note a thrown action adds once a step saved, e.g. " The image was saved." */
function useStepSavedNote() {
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
 * - `stepReports` is what the steps call: `showRefusal`, `noteStepSaved`, `goHomeAfterSave`;
 * - `saveOutcome` is what the form reads: `saved`, `serverProblem`, `clearServerProblem`.
 */
export function useSaveSteps<TValues extends FieldValues>(
  setError: UseFormSetError<TValues>,
) {
  const { serverProblem, showRefusal, showThrownProblem, clearServerProblem } =
    useServerProblem(setError);
  const { saved, goHomeAfterSave } = useSavedFlagAndGoHome();
  const { noteStepSaved, readStepSavedNote } = useStepSavedNote();

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
    stepReports: { showRefusal, noteStepSaved, goHomeAfterSave },
    saveOutcome: { saved, serverProblem, clearServerProblem },
  };
}

type SaveOutcome = ReturnType<typeof useSaveSteps>["saveOutcome"];

/** What a save hook gives its form: `save`, `saved`, and the message with its clearer. */
export function makeSaveHookResult<TChecked>(
  runSaveSteps: (saveSteps: () => Promise<void>) => Promise<void>,
  saveSteps: (values: TChecked) => Promise<void>,
  { saved, serverProblem, clearServerProblem }: SaveOutcome,
) {
  return {
    save: (values: TChecked) => runSaveSteps(() => saveSteps(values)),
    saved,
    serverMessage: { serverProblem, clearServerProblem },
  };
}
