import type { FieldValues, Path, UseFormSetFocus } from "react-hook-form";

/** The error list names fields with plain strings; every one is a form field. */
export function focusField<TValues extends FieldValues>(
  setFocus: UseFormSetFocus<TValues>,
  name: string,
) {
  // A cast for a limit of the library's types: a plain string is not a `Path`.
  setFocus(name as Path<TValues>);
}
