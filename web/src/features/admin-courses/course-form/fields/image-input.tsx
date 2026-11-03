"use client";

import type { ReactNode } from "react";
import {
  Controller,
  type FieldPathByValue,
  type FieldValues,
} from "react-hook-form";

import type { ChosenImage } from "../../image/course-image";
import { ImageField } from "../../image/image-field";
import type { CourseFormApi } from "./course-form-fields";

/** The course image picker wired to the form; the page decides what previews. */
export function ImageInput<T extends FieldValues>({
  form,
  name,
  isSubmitted,
  renderPreview,
}: {
  form: CourseFormApi<T>;
  /** The path of the image, which must hold a chosen image or null. */
  name: FieldPathByValue<T, ChosenImage | null>;
  isSubmitted: boolean;
  /** Receives the form's current image and returns what shows under the picker. */
  renderPreview: (image: ChosenImage | null) => ReactNode;
}) {
  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field, fieldState }) => (
        <ImageField
          preview={renderPreview(field.value)}
          onChange={field.onChange}
          onBlur={field.onBlur}
          fieldRef={field.ref}
          error={fieldState.error?.message}
          isTouched={fieldState.isTouched}
          isSubmitted={isSubmitted}
        />
      )}
    />
  );
}
