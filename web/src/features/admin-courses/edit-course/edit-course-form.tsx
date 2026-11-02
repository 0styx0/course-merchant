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
import { StatusSection } from "./status/status-section";
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

/** The save, plus the error list, which also warns before leaving unsaved edits. */
function useSaveAndErrorList(
  form: ReturnType<typeof useEditCourseFormState>["form"],
  priceRowCount: number,
  courseId: string,
  prefill: EditFormPrefill,
) {
  const { saved, ...saveResult } = useSaveEditedCourse(
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
  return { ...saveResult, errorList };
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
  const { save, serverMessage, errorList } = useSaveAndErrorList(
    form,
    priceRows.fields.length,
    courseId,
    prefill,
  );
  const { serverProblem, clearServerProblem } = serverMessage;
  const { isSubmitting } = form.formState;

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit(save, clearServerProblem)}
      className="flex flex-col gap-8"
    >
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
      <SaveButton label="Save changes" isSubmitting={isSubmitting} />
    </form>
  );
}
