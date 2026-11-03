"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";

import { ErrorSummary } from "@/components/form/error-summary";

import { useErrorListAndLeaveWarning } from "../course-form/hooks/use-error-list-and-leave-warning";
import { ContentLinkSection } from "../course-form/sections/content-link-section";
import { SaveButton } from "../course-form/sections/save-button";
import {
  makeEditCourseFormSchema,
  type EditCourseFormValues,
} from "../validation/edit-course-form-schema";
import { editCourseFields } from "./edit-course-fields";
import {
  EditBasicsSection,
  EditPricingSection,
  EditScheduleSection,
} from "./edit-course-sections";
import type { EditFormPrefill } from "./edit-form-prefill";
import { DeleteConfirmation } from "./status/delete-confirmation";
import { StatusSection } from "./status/status-section";
import { useConfirmBeforeDelete } from "./status/use-confirm-before-delete";
import { useSaveEditedCourse } from "./use-save-edited-course";

function useEditCourseFormState(prefill: EditFormPrefill) {
  const form = useForm<EditCourseFormValues, unknown, EditCourseFormValues>({
    resolver: zodResolver(
      makeEditCourseFormSchema(prefill.loadedSchedule, prefill.loadedPrices),
    ),
    defaultValues: prefill.values,
    mode: "onTouched",
    shouldFocusError: false,
  });
  const priceRows = useFieldArray({ control: form.control, name: "prices" });
  return { form, priceRows };
}

/**
 * The form's submit handler (which asks before deleting), whether a save is
 * running, the delete dialog and the error list, which also warns before
 * leaving unsaved edits.
 */
function useEditFormSubmit(
  form: ReturnType<typeof useEditCourseFormState>["form"],
  priceRowCount: number,
  courseId: string,
  prefill: EditFormPrefill,
) {
  const { save, saved, serverMessage } = useSaveEditedCourse(
    form,
    courseId,
    prefill.loadedSchedule,
    prefill.loadedPrices,
  );
  const errorList = useErrorListAndLeaveWarning(
    form,
    editCourseFields(priceRowCount),
    saved,
  );
  const deleteGate = useConfirmBeforeDelete(save, prefill.values.status, () =>
    form.setValue("status", prefill.values.status, { shouldDirty: true }),
  );
  return {
    submitForm: form.handleSubmit(
      deleteGate.saveOrAskToDelete,
      serverMessage.clearServerProblem,
    ),
    isSaving: form.formState.isSubmitting || deleteGate.isConfirmedSaveRunning,
    deleteConfirmation: deleteGate.deleteConfirmation,
    serverProblem: serverMessage.serverProblem,
    errorList,
  };
}

type EditCourseFormProps = {
  courseId: string;
  prefill: EditFormPrefill;
  /** Built on the server so the server and browser list the same zones. */
  timeZones: string[];
};

/** The "edit course" form. It saves the details and goes to the home page. */
export function EditCourseForm({
  courseId,
  prefill,
  timeZones,
}: EditCourseFormProps) {
  const { form, priceRows } = useEditCourseFormState(prefill);
  const { submitForm, isSaving, deleteConfirmation, serverProblem, errorList } =
    useEditFormSubmit(form, priceRows.fields.length, courseId, prefill);

  return (
    <form noValidate onSubmit={submitForm} className="flex flex-col gap-8">
      <ErrorSummary {...errorList} serverProblem={serverProblem} />
      <EditBasicsSection
        form={form}
        courseId={courseId}
        hasStoredImage={prefill.storedImageVersion !== null}
        isSubmitted={form.formState.isSubmitted}
      />
      <ContentLinkSection form={form} name="contentUrl" />
      <EditScheduleSection form={form} timeZones={timeZones} />
      <EditPricingSection
        form={form}
        priceRows={priceRows}
        pricesInEffect={prefill.loadedPrices.inEffect}
      />
      <StatusSection form={form} />
      <SaveButton label="Save changes" isSubmitting={isSaving} />
      <DeleteConfirmation {...deleteConfirmation} />
    </form>
  );
}
