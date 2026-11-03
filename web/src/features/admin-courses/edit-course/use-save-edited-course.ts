import { useRouter } from "next/navigation";
import { useRef } from "react";
import type { UseFormReturn } from "react-hook-form";

import type { ChosenImage } from "../image/course-image";
import {
  makeSaveHookResult,
  makeSecondStepFailedMessage,
  uploadChosenImage,
  useSaveSteps,
} from "../course-form/hooks/use-save-steps";
import {
  refusalMessage,
  type ServerProblem,
} from "../course-form/hooks/use-server-problem";
import type { CourseActionFailure } from "../save-course/course-action-result";
import { saveEditedDetailsAction } from "../save-course/edit/save-edited-details.action";
import type {
  EditCourseFormValues,
  LoadedPrices,
  LoadedSchedule,
} from "../validation/edit-course-form-schema";

type EditCourseFormApi = UseFormReturn<
  EditCourseFormValues,
  unknown,
  EditCourseFormValues
>;

type StepReports = ReturnType<
  typeof useSaveSteps<EditCourseFormValues>
>["stepReports"];

const imageSavedWords = "The image was saved";

/** The API's reason, after saying the image was saved when this try stored one. */
function makeDetailsRefusedMessage(
  wasImageStored: boolean,
  failure: CourseActionFailure,
): ServerProblem {
  if (!wasImageStored) return refusalMessage(failure);
  return makeSecondStepFailedMessage(
    failure.problem.title,
    imageSavedWords,
    "the course details didn't save",
    failure,
  );
}

/**
 * Uploads a newly chosen image once: a retry skips a file an earlier try
 * stored. Returns false after showing the API's refusal.
 */
function useUploadImageUnlessStored(
  courseId: string,
  stepReports: StepReports,
) {
  // The file an earlier try already stored, so a retry skips its upload.
  const storedImage = useRef<File>(undefined);

  async function uploadImageUnlessStored(image: ChosenImage | null) {
    if (image === null || image.file === storedImage.current) return true;
    const upload = await uploadChosenImage(courseId, image);
    if (upload?.state === "failure") {
      stepReports.showRefusal(refusalMessage(upload.error), upload.error);
      return false;
    }
    storedImage.current = image.file;
    stepReports.noteStepSaved(imageSavedWords);
    return true;
  }

  return {
    uploadImageUnlessStored,
    isImageStored: () => storedImage.current !== undefined,
  };
}

/**
 * Uploads a newly chosen image, then saves the edited details, status and
 * prices. Uploading first lets one save publish a course with its first image.
 * A refusal leaves a message and puts
 * its field errors on the fields; a save goes to the home page.
 * `startingSavedNote` shows until the form first holds an unsaved change.
 */
export function useSaveEditedCourse(
  form: EditCourseFormApi,
  courseId: string,
  loadedSchedule: LoadedSchedule,
  loadedPrices: LoadedPrices,
  startingSavedNote?: string,
) {
  const router = useRouter();
  const { runSaveSteps, stepReports, saveOutcome } = useSaveSteps(
    form.setError,
    { startingSavedNote, isDirty: form.formState.isDirty },
  );
  const imageUpload = useUploadImageUnlessStored(courseId, stepReports);

  async function uploadImageThenSaveDetails({
    image,
    ...fields
  }: EditCourseFormValues) {
    if (!(await imageUpload.uploadImageUnlessStored(image))) return;
    const details = await saveEditedDetailsAction(
      courseId,
      fields,
      loadedSchedule,
      loadedPrices,
    );
    if (details.state === "failure") {
      const message = makeDetailsRefusedMessage(
        imageUpload.isImageStored(),
        details.error,
      );
      return stepReports.showRefusal(message, details.error);
    }
    stepReports.markSavedThen(() => router.push("/"));
  }

  return makeSaveHookResult(
    runSaveSteps,
    uploadImageThenSaveDetails,
    saveOutcome,
  );
}
