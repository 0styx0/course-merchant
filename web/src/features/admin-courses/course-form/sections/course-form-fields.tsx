"use client";

import type { ComponentProps, ReactNode } from "react";
import {
  Controller,
  get,
  useWatch,
  type FieldPathByValue,
  type FieldValues,
  type Path,
  type RegisterOptions,
  type UseFormReturn,
} from "react-hook-form";

import { CharacterCount } from "@/components/form/character-count";
import {
  ValidatedField,
  type ValidatedFieldInputProps,
} from "@/components/form/validated-field";
import { Input } from "@/components/ui/input";

import {
  fieldErrorMessage,
  fieldErrorType,
} from "../problems/course-form-problems";
import { TimeZonePicker } from "../../schedule/time-zone-picker/time-zone-picker";

/**
 * The members of a form the fields use. It leaves out `handleSubmit`, which a
 * form with extra fields can't fit, so any course form's own type works here.
 */
export type CourseFormApi<T extends FieldValues> = Pick<
  UseFormReturn<T>,
  | "register"
  | "formState"
  | "control"
  | "trigger"
  | "getFieldState"
  | "setValue"
  | "watch"
>;

type FieldProps<T extends FieldValues> = {
  form: CourseFormApi<T>;
  name: Path<T>;
  label: string;
  description?: string;
  registerOptions?: RegisterOptions<T>;
};

/** The field's help text, then its "n / limit" counter. */
function FieldHelp<T extends FieldValues>({
  form,
  name,
  description,
  limit,
}: Pick<FieldProps<T>, "form" | "name" | "description"> & { limit: number }) {
  const value = useWatch({ control: form.control, name });
  return (
    <>
      {description && <span className="block">{description}</span>}
      <CharacterCount count={String(value ?? "").length} limit={limit} />
    </>
  );
}

function helpFor<T extends FieldValues>({
  limit,
  ...rest
}: Pick<FieldProps<T>, "form" | "name" | "description"> & {
  limit?: number;
}): ReactNode {
  if (limit === undefined) {
    return rest.description;
  }

  return <FieldHelp {...rest} limit={limit} />;
}

// `labelId` is for inputs that aren't labelable elements; these are.
function ariaProps({
  id,
  "aria-invalid": invalid,
  "aria-describedby": describedBy,
}: ValidatedFieldInputProps) {
  return { id, "aria-invalid": invalid, "aria-describedby": describedBy };
}

function stateOf<T extends FieldValues>(form: CourseFormApi<T>, name: Path<T>) {
  const { errors, touchedFields, isSubmitted } = form.formState;
  return {
    error: fieldErrorMessage(errors, name),
    touched: Boolean(get(touchedFields, name)),
    submitted: isSubmitted,
  };
}

/** The shared message id, only while the field's problem is a cross-field one. */
function sharedIdFor<T extends FieldValues>(
  form: CourseFormApi<T>,
  name: Path<T>,
  sharedMessageId: string | undefined,
) {
  const isCrossField = fieldErrorType(form.formState.errors, name) === "custom";
  return isCrossField ? sharedMessageId : undefined;
}

function InputPrefix({ prefix }: { prefix?: string }) {
  if (!prefix) return null;
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-sm text-muted-foreground"
    >
      {prefix}
    </span>
  );
}

/** An input box with an optional symbol shown inside it before the text. */
function PrefixedInput({
  prefix,
  ...inputProps
}: ComponentProps<typeof Input> & { prefix?: string }) {
  return (
    <div className="relative w-full">
      <InputPrefix prefix={prefix} />
      <Input className={prefix ? "pl-6" : undefined} {...inputProps} />
    </div>
  );
}

/** A text, date or time box wired to the form and to `ValidatedField`'s states. */
export function InputField<T extends FieldValues>({
  form,
  name,
  label,
  description,
  registerOptions,
  placeholder,
  limit,
  prefix,
  sharedMessageId,
  min,
  type = "text",
}: FieldProps<T> & {
  type?: "text" | "url" | "date" | "time";
  placeholder?: string;
  /** Shows an "n / limit" counter. Typing past it is allowed. */
  limit?: number;
  /** A symbol shown inside the box before the text, such as "$". */
  prefix?: string;
  /** Where a cross-field message is shown; "required" messages stay under the box. */
  sharedMessageId?: string;
  /** The earliest value the date or time picker offers. */
  min?: string;
}) {
  return (
    <ValidatedField
      label={label}
      description={helpFor({ form, name, description, limit })}
      errorMessageId={sharedIdFor(form, name, sharedMessageId)}
      {...stateOf(form, name)}
    >
      {(inputProps) => (
        <PrefixedInput
          prefix={prefix}
          type={type}
          min={min}
          placeholder={placeholder}
          {...ariaProps(inputProps)}
          {...form.register(name, registerOptions)}
        />
      )}
    </ValidatedField>
  );
}

/** The time zone picker wired to the form; a pick re-checks the times. */
export function TimeZoneField<T extends FieldValues>({
  form,
  name,
  recheck,
  timeZones,
}: {
  form: CourseFormApi<T>;
  /** The path of the time zone, which must hold a string. */
  name: FieldPathByValue<T, string>;
  /** The paths to validate again after a pick, since their times are read in the new zone. */
  recheck: Path<T>[];
  timeZones: string[];
}) {
  return (
    <div className="sm:col-span-2">
      <Controller
        control={form.control}
        name={name}
        render={({ field }) => (
          <ValidatedField label="Time zone" {...stateOf(form, field.name)}>
            {(inputProps) => (
              <TimeZonePicker
                timeZones={timeZones}
                value={field.value}
                onChange={(timeZone) => {
                  field.onChange(timeZone);
                  void form.trigger(recheck);
                }}
                onBlur={field.onBlur}
                inputRef={field.ref}
                {...ariaProps(inputProps)}
              />
            )}
          </ValidatedField>
        )}
      />
    </div>
  );
}
