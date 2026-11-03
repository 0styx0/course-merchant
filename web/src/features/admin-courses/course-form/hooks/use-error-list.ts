import { useRef } from "react";
import type { FieldValues, UseFormReturn } from "react-hook-form";

import {
  courseFormProblems,
  type ProblemField,
} from "../problems/course-form-problems";
import { focusField } from "../problems/focus-field";
import { useFocusSummaryOnSubmit } from "./use-focus-summary-on-submit";

/**
 * What a form needs around its error list: the entries (none until the first
 * submit) and the focus moves. The returned props go on `ErrorSummary`.
 */
export function useErrorList<TValues extends FieldValues, TChecked>(
  form: UseFormReturn<TValues, unknown, TChecked>,
  fields: readonly ProblemField[],
) {
  const ref = useRef<HTMLDivElement>(null);
  const { errors, isSubmitted, submitCount } = form.formState;

  useFocusSummaryOnSubmit(ref, submitCount);

  return {
    ref,
    problems: isSubmitted ? courseFormProblems(errors, fields) : [],
    onSelectField: (name: string) => focusField(form.setFocus, name),
  };
}
