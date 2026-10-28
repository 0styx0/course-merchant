"use client";

import type { ReactNode } from "react";
import {
  get,
  type Path,
  type RegisterOptions,
  type UseFormReturn,
} from "react-hook-form";

import {
  FormField,
  type FormFieldInputProps,
} from "@/components/form/form-field";
import { Input } from "@/components/ui/input";

import { fieldErrorMessage } from "./course-form-problems";
import type { CourseFormValues } from "./course-form-schema";

type CourseForm = UseFormReturn<CourseFormValues>;

type FieldProps = {
  form: CourseForm;
  name: Path<CourseFormValues>;
  label: string;
  description?: string;
  registerOptions?: RegisterOptions<CourseFormValues>;
};

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

/** A text, date or time box wired to the form and to `FormField`'s states. */
export function InputField({
  form,
  name,
  label,
  description,
  registerOptions,
  type = "text",
}: FieldProps & { type?: "text" | "url" | "date" | "time" }) {
  return (
    <FormField label={label} description={description} {...stateOf(form, name)}>
      {(inputProps) => (
        <Input
          type={type}
          {...ariaProps(inputProps)}
          {...form.register(name, registerOptions)}
        />
      )}
    </FormField>
  );
}

const SELECT_CLASSES =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30";

/** A native `<select>` wired like `InputField`. */
export function SelectField({
  form,
  name,
  label,
  description,
  registerOptions,
  children,
}: FieldProps & { children: ReactNode }) {
  return (
    <FormField label={label} description={description} {...stateOf(form, name)}>
      {(inputProps) => (
        <select
          className={SELECT_CLASSES}
          {...ariaProps(inputProps)}
          {...form.register(name, registerOptions)}
        >
          {children}
        </select>
      )}
    </FormField>
  );
}
