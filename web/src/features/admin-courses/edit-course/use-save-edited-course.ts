import type { UseFormReturn } from "react-hook-form";

import { useSaveThenUploadImage } from "../course-form/hooks/use-save-then-upload-image";
import { saveEditedDetailsAction } from "../save-course/edit/save-edited-details.action";
import type {
  EditCourseFormValues,
  EditedDetailsValues,
  LoadedPrices,
  LoadedSchedule,
} from "../validation/edit-course-form-schema";
import type { FieldsSentBackUnchanged } from "./edit-form-prefill";

type EditCourseFormApi = UseFormReturn<
  EditCourseFormValues,
  unknown,
  EditCourseFormValues
>;

/**
 * Saves the edited details and prices with the fields it cannot edit yet, as
 * loaded, then uploads a newly chosen image. A refusal leaves a message and
 * puts its field errors on the fields; a save goes to the home page.
 */
export function useSaveEditedCourse(
  form: EditCourseFormApi,
  courseId: string,
  loadedSchedule: LoadedSchedule,
  loadedPrices: LoadedPrices,
  fieldsSentBackUnchanged: FieldsSentBackUnchanged,
) {
  function saveEditedDetails(fields: EditedDetailsValues) {
    return saveEditedDetailsAction(
      courseId,
      fields,
      loadedSchedule,
      loadedPrices,
      fieldsSentBackUnchanged,
    );
  }

  return useSaveThenUploadImage(
    form,
    saveEditedDetails,
    "The course details were saved",
  );
}
