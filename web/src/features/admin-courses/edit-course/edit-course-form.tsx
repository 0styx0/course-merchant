"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { ErrorSummary } from "@/components/form/error-summary";

import { useErrorListAndLeaveWarning } from "../course-form/hooks/use-error-list-and-leave-warning";
import { ContentLinkSection } from "../course-form/sections/content-link-section";
import { SaveButton } from "../course-form/sections/save-button";
import {
  editCourseFormSchema,
  type EditCourseFormValues,
} from "../validation/edit-course-form-schema";
import { editCourseFields } from "./edit-course-fields";
import { EditBasicsSection, EditScheduleSection } from "./edit-course-sections";
import type { EditCourseStart } from "./edit-course-start";
import { useSaveEditedCourse } from "./use-save-edited-course";

function useEditCourseFormState(start: EditCourseStart) {
  return useForm<EditCourseFormValues, unknown, EditCourseFormValues>({
    resolver: zodResolver(editCourseFormSchema),
    defaultValues: start.values,
    mode: "onTouched",
    shouldFocusError: false,
  });
}

type EditCourseFormProps = {
  courseId: string;
  start: EditCourseStart;
  /** Built on the server so the server and browser list the same zones. */
  timeZones: string[];
};

/** The "edit course" form. It saves the details and goes to the home page. */
export function EditCourseForm({
  courseId,
  start,
  timeZones,
}: EditCourseFormProps) {
  const form = useEditCourseFormState(start);
  const { save, saved, serverProblem, clearServerProblem } =
    useSaveEditedCourse(form, courseId, start.keptParts);
  const errorList = useErrorListAndLeaveWarning(form, editCourseFields, saved);
  const { isSubmitting } = form.formState;

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit(save, clearServerProblem)}
      className="flex flex-col gap-8"
    >
      <ErrorSummary {...errorList} serverProblem={serverProblem} />
      <EditBasicsSection form={form} />
      <ContentLinkSection form={form} name="contentUrl" />
      <EditScheduleSection
        form={form}
        timeZones={timeZones}
        keptSchedule={start.keptParts.schedule}
      />
      <SaveButton label="Save changes" isSubmitting={isSubmitting} />
    </form>
  );
}
