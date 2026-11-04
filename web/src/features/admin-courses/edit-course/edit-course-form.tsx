"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";

import { cn } from "cn";

import { ErrorSummary } from "@/components/form/error-summary";
import { SavedNote } from "@/components/form/saved-note";

import { useErrorList } from "../course-form/hooks/use-error-list";
import { useLeaveWarning } from "../course-form/hooks/use-leave-warning";
import { ContentLinkSection } from "../course-form/sections/content-link-section";
import { SaveButton } from "../course-form/sections/save-button";
import {
  makeEditCourseFormSchema,
  type EditCourseFormValues,
} from "../validation/edit-course-form-schema";
import { editCourseFields } from "./edit-course-fields";
import { editCoursePath } from "./edit-course-path";
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
    values: prefill.values,
    mode: "onTouched",
    shouldFocusError: false,
  });
  const priceRows = useFieldArray({ control: form.control, name: "prices" });
  return { form, priceRows };
}

/**
 * Drops the `?saved=draft` flag from the address once the note shows, so a
 * reload shows no note. `replaceState` keeps Next's router in step.
 */
function useDropSavedFlag(courseId: string, startingSavedNote?: string) {
  useEffect(() => {
    if (startingSavedNote === undefined) return;
    window.history.replaceState(null, "", editCoursePath(courseId));
  }, [courseId, startingSavedNote]);
}

/**
 * The form's submit handler (which asks before deleting), whether a save is
 * running, the delete dialog, the saved note and the error list. It also warns
 * before leaving unsaved edits.
 */
function useEditFormSubmit(
  form: ReturnType<typeof useEditCourseFormState>["form"],
  priceRowCount: number,
  courseId: string,
  prefill: EditFormPrefill,
  startingSavedNote?: string,
) {
  const { save, savedNote, isSaved, serverMessage } = useSaveEditedCourse(
    form,
    courseId,
    prefill.loadedSchedule,
    prefill.loadedPrices,
    startingSavedNote,
  );
  const errorList = useErrorList(form, editCourseFields(priceRowCount));
  useLeaveWarning(form.formState.isDirty && !isSaved);
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
    savedNote,
    errorList,
  };
}

/**
 * Margins on every control that can take focus, so the browser scrolls a
 * focused control fully between the sticky top box and the Save bar:
 * `scroll-mt-52` is 13rem (the top box's 12rem cap plus a gap) and
 * `scroll-mb-24` is 6rem (the bar's height plus a gap).
 */
const clearOfStickyBoxes =
  "[&_:is(button,input,select,textarea,[tabindex])]:scroll-mt-52 [&_:is(button,input,select,textarea,[tabindex])]:scroll-mb-24";

/**
 * Keeps Save on screen at the bottom while the admin scrolls, like the sticky
 * top box (`StickyFormNotice`) does at the top. At the end of the form it sits
 * in normal flow below Pricing, after the form's `gap-8`, so it covers no field.
 */
function SaveBar({ isSaving }: { isSaving: boolean }) {
  return (
    <div
      data-testid="save-bar"
      className="sticky bottom-0 z-10 border-t bg-background py-3"
    >
      <SaveButton label="Save changes" isSubmitting={isSaving} />
    </div>
  );
}

type EditCourseFormProps = {
  courseId: string;
  prefill: EditFormPrefill;
  /** Built on the server so the server and browser list the same zones. */
  timeZones: string[];
  /** Shown until the first change, e.g. "Saved as a draft" on arrival from create. */
  startingSavedNote?: string;
};

/** The "edit course" form. It saves the details, stays on the page and takes the reloaded course as its values. */
export function EditCourseForm({
  courseId,
  prefill,
  timeZones,
  startingSavedNote,
}: EditCourseFormProps) {
  const { form, priceRows } = useEditCourseFormState(prefill);
  const submit = useEditFormSubmit(
    form,
    priceRows.fields.length,
    courseId,
    prefill,
    startingSavedNote,
  );
  useDropSavedFlag(courseId, startingSavedNote);

  return (
    <form
      noValidate
      onSubmit={submit.submitForm}
      className={cn("flex flex-col gap-8", clearOfStickyBoxes)}
    >
      <SavedNote note={submit.savedNote} />
      <ErrorSummary
        {...submit.errorList}
        serverProblem={submit.serverProblem}
      />
      <StatusSection
        form={form}
        hasEnrollments={prefill.hasEnrollments}
        loadedStatus={prefill.values.status}
      />
      <EditBasicsSection
        form={form}
        courseId={courseId}
        storedImageVersion={prefill.storedImageVersion}
        isSubmitted={form.formState.isSubmitted}
      />
      <ContentLinkSection form={form} name="contentUrl" />
      <EditScheduleSection
        form={form}
        timeZones={timeZones}
        loadedTimeZone={prefill.values.schedule.timeZone}
        scheduleProgress={prefill.scheduleProgress}
      />
      <EditPricingSection
        form={form}
        priceRows={priceRows}
        pricesInEffect={prefill.loadedPrices.inEffect}
      />
      <SaveBar isSaving={submit.isSaving} />
      <DeleteConfirmation {...submit.deleteConfirmation} />
    </form>
  );
}
