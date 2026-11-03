import { useRouter } from "next/navigation";
import { useRef } from "react";
import type { UseFormReturn } from "react-hook-form";

import { useSaveThenUploadImage } from "../course-form/hooks/use-save-then-upload-image";
import type {
  CheckedCourseFormWithImageValues,
  CourseFormWithImageValues,
} from "../validation/course-form-schema";
import { type CourseActionResult } from "../save-course/course-action-result";
import { createCourseAction } from "../save-course/create/create-course.action";
import { retryDraftSaveAction } from "../save-course/create/retry-draft-save.action";
import { editCoursePath } from "../edit-course/edit-course-path";

type CourseForm = UseFormReturn<
  CourseFormWithImageValues,
  unknown,
  CheckedCourseFormWithImageValues
>;

/** The fields the draft save sends; the image goes up in its own request. */
type CourseDetailsFields = Omit<CheckedCourseFormWithImageValues, "image">;

/** Creates the draft, or updates it when an earlier try already created it. */
function saveDraft(
  draftId: string | undefined,
  fields: CourseDetailsFields,
): Promise<CourseActionResult> {
  return draftId
    ? retryDraftSaveAction(draftId, fields)
    : createCourseAction(fields);
}

/**
 * Saves the form in two steps: the draft, then its image. The draft's id is
 * kept, so the next try updates that draft instead of creating a second course.
 * A save opens the draft's edit page.
 */
export function useSaveNewCourse(form: CourseForm) {
  const router = useRouter();
  const draftId = useRef<string>(undefined);

  async function saveDraftAndRememberItsId(fields: CourseDetailsFields) {
    const draft = await saveDraft(draftId.current, fields);
    if (draft.state === "success") draftId.current = draft.data.courseId;
    return draft;
  }

  return useSaveThenUploadImage(
    form,
    saveDraftAndRememberItsId,
    "The course was saved as a draft",
    (courseId) => router.push(editCoursePath(courseId, "draft")),
  );
}
