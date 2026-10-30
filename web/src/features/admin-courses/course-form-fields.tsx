"use client";

import type { ReactNode } from "react";
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
  FormField,
  type FormFieldInputProps,
} from "@/components/form/form-field";
import { Input } from "@/components/ui/input";

import { fieldErrorMessage } from "./course-form-problems";
import { TimeZonePicker } from "./schedule/time-zone-picker";
import type { CourseFormValues } from "./validation/course-form-schema";

type CourseForm = UseFormReturn<CourseFormValues>;

type FieldProps = {
  form: CourseForm;
  name: Path<CourseFormValues>;
  label: string;
  description?: string;
  registerOptions?: RegisterOptions<CourseFormValues>;
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
}: FormFieldInputProps) {
  return { id, "aria-invalid": invalid, "aria-describedby": describedBy };
}

function stateOf(form: CourseForm, name: Path<CourseFormValues>) {
  const { errors, touchedFields, isSubmitted } = form.formState;
  return {
    error: fieldErrorMessage(errors, name),
    touched: Boolean(get(touchedFields, name)),
    submitted: isSubmitted,
  };
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

/** A text, date or time box wired to the form and to `FormField`'s states. */
export function InputField({
  form,
  name,
  label,
  description,
  registerOptions,
  placeholder,
  limit,
  prefix,
  type = "text",
}: FieldProps & {
  type?: "text" | "url" | "date" | "time";
  placeholder?: string;
  /** Shows an "n / limit" counter. Typing past it is allowed. */
  limit?: number;
  /** A symbol shown inside the box before the text, such as "$". */
  prefix?: string;
}) {
  return (
    <FormField
      label={label}
      description={helpFor({ form, name, description, limit })}
      {...stateOf(form, name)}
    >
      {(inputProps) => (
        <div className="relative w-full">
          <InputPrefix prefix={prefix} />
          <Input
            type={type}
            placeholder={placeholder}
            className={prefix ? "pl-6" : undefined}
            {...ariaProps(inputProps)}
            {...form.register(name, registerOptions)}
          />
        </div>
      )}
    </FormField>
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
        <FormField label="Time zone" {...stateOf(form, field.name)}>
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
        </FormField>
      )}
    />
  );
}
