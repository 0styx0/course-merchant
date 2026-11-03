import type { FieldValues, UseFormReturn } from "react-hook-form";

import type { CourseActionResult } from "../../save-course/course-action-result";
import {
  makeSaveHookResult,
  makeSecondStepFailedMessage,
  uploadChosenImage,
  useSaveSteps,
  type CheckedValuesWithImage,
} from "./use-save-steps";
import { refusalMessage } from "./use-server-problem";

/** The caller's own save of everything but the image. */
type SaveCourseDetails<TChecked> = (
  fields: Omit<TChecked, "image">,
) => Promise<CourseActionResult>;

/**
 * Saves the form in two steps: the details, then the image when one is chosen.
 * A refused step leaves a message and puts its field errors on the fields.
 * `saveDetails` is the caller's own save; `detailsSavedWords`
 * says that the details are saved, for the messages shown when the image step fails.
 * `afterSave` runs with the course's id once both steps saved.
 */
export function useSaveThenUploadImage<
  TValues extends FieldValues,
  TChecked extends CheckedValuesWithImage,
>(
  form: UseFormReturn<TValues, unknown, TChecked>,
  saveDetails: SaveCourseDetails<TChecked>,
  detailsSavedWords: string,
  afterSave: (courseId: string) => void,
) {
  const { runSaveSteps, stepReports, saveOutcome } = useSaveSteps(
    form.setError,
  );

  async function saveDetailsThenUploadImage({ image, ...fields }: TChecked) {
    const details = await saveDetails(fields);
    if (details.state === "failure") {
      return stepReports.showRefusal(
        refusalMessage(details.error),
        details.error,
      );
    }
    stepReports.noteStepSaved(detailsSavedWords);
    const upload = await uploadChosenImage(details.data.courseId, image);
    if (upload?.state === "failure") {
      const message = makeSecondStepFailedMessage(
        "Image upload failed",
        detailsSavedWords,
        "the image didn't upload",
        upload.error,
      );
      return stepReports.showRefusal(message, upload.error);
    }
    stepReports.markSavedThen(() => afterSave(details.data.courseId));
  }

  return makeSaveHookResult(
    runSaveSteps,
    saveDetailsThenUploadImage,
    saveOutcome,
  );
}
