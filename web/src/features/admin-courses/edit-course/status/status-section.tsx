"use client";

import { useController, type UseFormReturn } from "react-hook-form";

import { FormSection } from "@/components/form/form-section";
import { showsFieldError } from "@/components/form/validated-field";
import { FieldError } from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import type { EditCourseFormValues } from "../../validation/edit-course-form-schema";
import { courseStatusLabels, statusFieldLabel } from "../edit-course-fields";

type CourseStatusName = EditCourseFormValues["status"];

/** The status choices in page order, each with what it means for the course. */
const statusChoices = [
  {
    value: "published",
    label: courseStatusLabels.published,
    meaning: "Students can find and buy it.",
  },
  {
    value: "drafted",
    label: courseStatusLabels.drafted,
    meaning: "Hidden while you work on it.",
  },
  {
    value: "archived",
    label: courseStatusLabels.archived,
    meaning: "Hidden, can be published again.",
  },
  {
    value: "deleted",
    label: courseStatusLabels.deleted,
    meaning: "Removed from the admin list.",
  },
] as const satisfies {
  value: CourseStatusName;
  label: string;
  meaning: string;
}[];

type StatusChoice = (typeof statusChoices)[number];

const lockedDeletedMeaning = "Students are enrolled. Archive it instead.";

/**
 * The API refuses a change to deleted when the course has students. A course
 * stored as deleted is not being changed, so it keeps its option.
 */
function isDeletedOptionLocked(
  choice: StatusChoice,
  hasEnrollments: boolean,
  loadedStatus: CourseStatusName,
) {
  return (
    choice.value === "deleted" && hasEnrollments && loadedStatus !== "deleted"
  );
}

/** One option: the radio, its label and what it means. */
function StatusOption({
  choice,
  focusRef,
  isInvalid,
  isLocked,
}: {
  choice: StatusChoice;
  /** Set on the chosen option, so the error list can focus it. */
  focusRef?: (element: HTMLElement | null) => void;
  isInvalid: boolean;
  /** Greys the option out and shows why, in place of its usual meaning. */
  isLocked: boolean;
}) {
  const labelId = `status-${choice.value}-label`;
  const meaningId = `status-${choice.value}-meaning`;
  return (
    <label className="flex items-start gap-3">
      <RadioGroupItem
        value={choice.value}
        ref={focusRef}
        // Named by the label alone, so the meaning reads as a description.
        aria-labelledby={labelId}
        aria-describedby={meaningId}
        aria-invalid={isInvalid}
        disabled={isLocked}
        // The radio is a span, so the `disabled:` styles of the shared radio never match.
        className="mt-0.5 data-disabled:cursor-not-allowed data-disabled:opacity-50"
      />
      <span className="flex flex-col">
        <span id={labelId} className="font-medium">
          {choice.label}
        </span>
        <span id={meaningId} className="text-sm text-muted-foreground">
          {isLocked ? lockedDeletedMeaning : choice.meaning}
        </span>
      </span>
    </label>
  );
}

type StatusSectionProps = {
  form: UseFormReturn<EditCourseFormValues>;
  hasEnrollments: boolean;
  /** The status the course had when the page loaded. */
  loadedStatus: CourseStatusName;
};

/** The status options wired to the form field, then the field's message. */
function StatusField({
  form,
  hasEnrollments,
  loadedStatus,
}: StatusSectionProps) {
  const { field, fieldState } = useController({
    control: form.control,
    name: "status",
  });
  const error = fieldState.error?.message;
  const doesShowError = showsFieldError({
    error,
    isTouched: fieldState.isTouched,
    isSubmitted: form.formState.isSubmitted,
  });
  return (
    <>
      <RadioGroup
        aria-label={statusFieldLabel}
        value={field.value}
        onValueChange={field.onChange}
        onBlur={field.onBlur}
      >
        {statusChoices.map((choice) => (
          <StatusOption
            key={choice.value}
            choice={choice}
            focusRef={choice.value === field.value ? field.ref : undefined}
            isInvalid={doesShowError}
            isLocked={isDeletedOptionLocked(
              choice,
              hasEnrollments,
              loadedStatus,
            )}
          />
        ))}
      </RadioGroup>
      {doesShowError && <FieldError>{error}</FieldError>}
    </>
  );
}

/** The edit form's status section; arrow keys move between the enabled options. */
export function StatusSection(props: StatusSectionProps) {
  return (
    <FormSection title={statusFieldLabel} description="Who can see the course.">
      <StatusField {...props} />
    </FormSection>
  );
}
