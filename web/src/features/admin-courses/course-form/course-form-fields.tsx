"use client";

import type { ComponentProps, ReactNode } from "react";
import {
  Controller,
  get,
  useWatch,
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

import { fieldErrorMessage, fieldErrorType } from "./course-form-problems";
import { TimeZonePicker } from "../schedule/time-zone-picker/time-zone-picker";
import type { CourseFormWithImageValues } from "../validation/course-form-schema";

type CourseForm = UseFormReturn<CourseFormWithImageValues>;

type FieldProps = {
  form: CourseForm;
  name: Path<CourseFormWithImageValues>;
  label: string;
  description?: string;
  registerOptions?: RegisterOptions<CourseFormWithImageValues>;
};

/** The field's help text, then its "n / limit" counter. */
function FieldHelp({
  form,
  name,
  description,
  limit,
}: Pick<FieldProps, "form" | "name" | "description"> & { limit: number }) {
  const value = useWatch({ control: form.control, name });
  return (
    <>
      {description && <span className="block">{description}</span>}
      <CharacterCount count={String(value ?? "").length} limit={limit} />
    </>
  );
}

function helpFor({
  limit,
  ...rest
}: Pick<FieldProps, "form" | "name" | "description"> & {
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

function stateOf(form: CourseForm, name: Path<CourseFormWithImageValues>) {
  const { errors, touchedFields, isSubmitted } = form.formState;
  return {
    error: fieldErrorMessage(errors, name),
    touched: Boolean(get(touchedFields, name)),
    submitted: isSubmitted,
  };
}

/** The shared message id, only while the field's problem is a cross-field one. */
function sharedIdFor(
  form: CourseForm,
  name: Path<CourseFormWithImageValues>,
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
export function InputField({
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
}: FieldProps & {
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
export function TimeZoneField({
  form,
  timeZones,
}: {
  form: CourseForm;
  timeZones: string[];
}) {
  return (
    <Controller
      control={form.control}
      name="schedule.timeZone"
      render={({ field }) => (
        <ValidatedField label="Time zone" {...stateOf(form, field.name)}>
          {(inputProps) => (
            <TimeZonePicker
              timeZones={timeZones}
              value={field.value}
              onChange={(timeZone) => {
                field.onChange(timeZone);
                void form.trigger(["schedule", "prices"]);
              }}
              onBlur={field.onBlur}
              inputRef={field.ref}
              {...ariaProps(inputProps)}
            />
          )}
        </ValidatedField>
      )}
    />
  );
}
