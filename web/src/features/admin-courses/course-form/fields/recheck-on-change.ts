import type { FieldPathByValue, FieldValues, PathValue } from "react-hook-form";

import type { CourseFormApi } from "./course-form-fields";

/** True when the admin has reached the field or it already shows a problem. */
function isReachedOrInvalid<T extends FieldValues>(
  form: CourseFormApi<T>,
  name: FieldPathByValue<T, string>,
) {
  const { isTouched, error } = form.getFieldState(name);
  return isTouched || Boolean(error);
}

/** Sets the field's value, marks it touched and checks it. */
function setFieldValueTouchedAndChecked<T extends FieldValues>(
  form: CourseFormApi<T>,
  name: FieldPathByValue<T, string>,
  newValue: string,
) {
  // The library types `setValue`'s value as the field's type, which it can't
  // narrow to string for a generic `T`, so it needs this cast.
  form.setValue(name, newValue as PathValue<T, typeof name>, {
    shouldTouch: true,
    shouldValidate: true,
  });
}

/** Checks again the other compared fields the admin has reached or that show a problem. */
function recheckOtherReachedFields<T extends FieldValues>(
  form: CourseFormApi<T>,
  changedName: FieldPathByValue<T, string>,
  comparedNames: FieldPathByValue<T, string>[],
) {
  const others = comparedNames.filter(
    (other) => other !== changedName && isReachedOrInvalid(form, other),
  );
  if (others.length > 0) void form.trigger(others);
}

/**
 * A native date or time picker may never blur its input, so a change marks
 * the field touched and checks it. The fields it compares with are checked
 * too, but only those already reached or showing a problem, so none is
 * flagged early.
 */
export function makeRecheckingChangeHandler<T extends FieldValues>(
  form: CourseFormApi<T>,
  name: FieldPathByValue<T, string>,
  comparedNames: FieldPathByValue<T, string>[],
) {
  return (event: { target: { value: string } }) => {
    setFieldValueTouchedAndChecked(form, name, event.target.value);
    recheckOtherReachedFields(form, name, comparedNames);
  };
}
