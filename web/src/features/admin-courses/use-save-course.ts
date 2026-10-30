import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { Path, UseFormReturn } from "react-hook-form";

import type { ChosenImage } from "./image/course-image";
import type {
  CheckedCourseFormWithImageValues,
  CourseFormWithImageValues,
} from "./validation/course-form-schema";
import {
  type CourseActionFailure,
  type CourseActionResult,
} from "./save-course/course-action-result";
import { createCourseAction } from "./save-course/create-course.action";
import { updateCourseAction } from "./save-course/update-course.action";
import { uploadCourseImageAction } from "./save-course/upload-image/upload-course-image.action";

type ServerProblem = { title: string; detail: string };

type CourseForm = UseFormReturn<
  CourseFormWithImageValues,
  unknown,
  CheckedCourseFormWithImageValues
>;

const rejectedProblem: ServerProblem = {
  title: "Couldn't save the course",
  detail:
    "Something went wrong while saving. Check your connection and try again.",
};

/** Says the draft exists, then gives the API's own reason. */
function uploadFailedProblem({ problem }: CourseActionFailure): ServerProblem {
  return {
    title: "Image upload failed",
    detail: `The course was saved as a draft, but the image didn't upload. ${problem.detail}`,
  };
}

function imageFormData(image: ChosenImage): FormData {
  const formData = new FormData();
  formData.set("image", image.file);
  return formData;
}

/** Creates the draft, or updates it when an earlier try already created it. */
function saveDraft(
  draftId: string | undefined,
  fields: Omit<CheckedCourseFormWithImageValues, "image">,
): Promise<CourseActionResult> {
  return draftId
    ? updateCourseAction(draftId, fields)
    : createCourseAction(fields);
}

function problemTextOf({ problem }: CourseActionFailure): ServerProblem {
  return { title: problem.title, detail: problem.detail };
}

/** The message above the form, and the errors put on its fields. */
function useServerProblem(form: CourseForm) {
  const [serverProblem, setServerProblem] = useState<ServerProblem>();

  function showFailure(problem: ServerProblem, failure: CourseActionFailure) {
    setServerProblem(problem);
    for (const { path, message } of failure.fieldErrors) {
      form.setError(path as Path<CourseFormWithImageValues>, { message });
    }
  }

  function showRejected(hasDraft: boolean) {
    const draftNote = hasDraft ? " The course was saved as a draft." : "";
    setServerProblem({
      ...rejectedProblem,
      detail: rejectedProblem.detail + draftNote,
    });
  }

  return {
    serverProblem,
    showFailure,
    showRejected,
    clearServerProblem: () => setServerProblem(undefined),
  };
}

/**
 * Saves the form in two steps: the draft, then its image. A refused step leaves
 * a message and puts its field errors on the fields. The draft's id is kept, so
 * the next try updates that draft instead of creating a second course.
 */
export function useSaveCourse(form: CourseForm) {
  const router = useRouter();
  const { serverProblem, showFailure, showRejected, clearServerProblem } =
    useServerProblem(form);
  const [saved, setSaved] = useState(false);
  const draftId = useRef<string>(undefined);

  async function saveDraftThenUploadImage({
    image,
    ...fields
  }: CheckedCourseFormWithImageValues) {
    const draft = await saveDraft(draftId.current, fields);
    if (draft.state === "failure") {
      return showFailure(problemTextOf(draft.error), draft.error);
    }
    draftId.current = draft.data.courseId;
    const upload = await uploadCourseImageAction(
      draftId.current,
      imageFormData(image),
    );
    if (upload.state === "failure") {
      return showFailure(uploadFailedProblem(upload.error), upload.error);
    }
    setSaved(true);
    router.push("/");
  }

  async function save(values: CheckedCourseFormWithImageValues) {
    clearServerProblem();
    try {
      await saveDraftThenUploadImage(values);
    } catch {
      // A rejected Server Action throws instead of returning a failure.
      showRejected(draftId.current !== undefined);
    }
  }

  return { save, saved, serverProblem, clearServerProblem };
}
