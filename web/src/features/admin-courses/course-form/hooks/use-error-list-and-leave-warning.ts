import { useRef } from "react";
import type { FieldValues, UseFormReturn } from "react-hook-form";

import {
  courseFormProblems,
  type ProblemField,
} from "../problems/course-form-problems";
import { focusField } from "../problems/focus-field";
import { useFocusSummaryOnSubmit } from "./use-focus-summary-on-submit";
import { useLeaveWarning } from "./use-leave-warning";

/**
 * What a form needs around its error list: the entries (none until the first
 * submit), the focus moves, and the leave warning, which is off once saved.
 * The returned props go on `ErrorSummary`.
 */
export function useErrorListAndLeaveWarning<
  TValues extends FieldValues,
  TChecked,
>(
  form: UseFormReturn<TValues, unknown, TChecked>,
  fields: readonly ProblemField[],
  saved: boolean,
) {
  const ref = useRef<HTMLDivElement>(null);
  const { errors, isDirty, isSubmitted, submitCount } = form.formState;

  useFocusSummaryOnSubmit(ref, submitCount);
  useLeaveWarning(isDirty && !saved);

  return {
    ref,
    problems: isSubmitted ? courseFormProblems(errors, fields) : [],
    onSelectField: (name: string) => focusField(form.setFocus, name),
  };
}
