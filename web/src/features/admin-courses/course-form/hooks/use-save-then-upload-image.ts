import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { UseFormReturn } from "react-hook-form";

import type { ChosenImage } from "../../image/course-image";
import {
  type CourseActionFailure,
  type CourseActionResult,
} from "../../save-course/course-action-result";
import { uploadCourseImageAction } from "../../save-course/upload-image/upload-course-image.action";
import type {
  CheckedCourseFormWithImageValues,
  CourseFormWithImageValues,
} from "../../validation/course-form-schema";
import {
  refusalMessage,
  useServerProblem,
  type ServerProblem,
} from "./use-server-problem";

type CourseForm = UseFormReturn<
  CourseFormWithImageValues,
  unknown,
  CheckedCourseFormWithImageValues
>;

export type CourseDetailsFields = Omit<
  CheckedCourseFormWithImageValues,
  "image"
>;

type SaveCourseDetails = (
  fields: CourseDetailsFields,
) => Promise<CourseActionResult>;

/** Says the details are saved, then gives the API's own reason. */
function makeImageUploadFailedMessage(
  detailsSavedWords: string,
  { problem }: CourseActionFailure,
): ServerProblem {
  return {
    title: "Image upload failed",
    detail: `${detailsSavedWords}, but the image didn't upload. ${problem.detail}`,
  };
}

function uploadChosenImage(courseId: string, image: ChosenImage) {
  const formData = new FormData();
  formData.set("image", image.file);
  return uploadCourseImageAction(courseId, formData);
}

/**
 * Saves the form in two steps: the details, then the image. A refused step
 * leaves a message and puts its field errors on the fields. `saveDetails` is
 * the caller's own save (create or edit); `detailsSavedWords` says that the
 * details are saved, for the messages shown when the image step fails.
 */
export function useSaveThenUploadImage(
  form: CourseForm,
  saveDetails: SaveCourseDetails,
  detailsSavedWords: string,
) {
  const router = useRouter();
  const { serverProblem, showRefusal, showThrownProblem, clearServerProblem } =
    useServerProblem(form.setError);
  const [saved, setSaved] = useState(false);
  // Set once the details are saved, so a later thrown action can mention it.
  const detailsSavedNote = useRef<string>(undefined);

  async function saveDetailsThenUploadImage({
    image,
    ...fields
  }: CheckedCourseFormWithImageValues) {
    const details = await saveDetails(fields);
    if (details.state === "failure") {
      return showRefusal(refusalMessage(details.error), details.error);
    }
    detailsSavedNote.current = ` ${detailsSavedWords}.`;
    const upload = await uploadChosenImage(details.data.courseId, image);
    if (upload.state === "failure") {
      return showRefusal(
        makeImageUploadFailedMessage(detailsSavedWords, upload.error),
        upload.error,
      );
    }
    setSaved(true);
    router.push("/");
  }

  async function save(values: CheckedCourseFormWithImageValues) {
    clearServerProblem();
    try {
      await saveDetailsThenUploadImage(values);
    } catch {
      // A rejected Server Action throws instead of returning a failure.
      showThrownProblem(detailsSavedNote.current);
    }
  }

  return { save, saved, serverProblem, clearServerProblem };
}
