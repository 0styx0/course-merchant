import { useEffect, type RefObject } from "react";
import type { FormFieldError } from "@/lib/api/form-errors";

/**
 * Each time a new list of field errors arrives, focuses the box whose `name`
 * equals the first error's path.
 */
export function useFocusFirstInvalidField(
  formRef: RefObject<HTMLFormElement | null>,
  fieldErrors: FormFieldError[],
) {
  useEffect(() => {
    const firstPath = fieldErrors[0]?.path;
    if (!firstPath) return;
    const box = formRef.current?.elements.namedItem(firstPath);
    if (box instanceof HTMLElement) box.focus();
  }, [formRef, fieldErrors]);
}
