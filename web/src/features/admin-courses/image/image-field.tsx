"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";

import {
  ValidatedField,
  type ValidatedFieldInputProps,
} from "@/components/form/validated-field";
import { Input } from "@/components/ui/input";

import {
  ACCEPTED_IMAGE_TYPES,
  measureImage,
  type ChosenImage,
} from "./course-image";

type ImageFieldProps = {
  /** What shows under the picker: the chosen file, a stored image, or nothing. */
  preview: ReactNode;
  onChange: (image: ChosenImage) => void;
  onBlur: () => void;
  /** react-hook-form's `field.ref`: lets it and the error list focus the input. */
  fieldRef: (handle: { focus: () => void } | null) => void;
  error?: string;
  isTouched: boolean;
  isSubmitted: boolean;
};

type FileInputProps = Omit<ValidatedFieldInputProps, "labelId"> &
  Pick<ImageFieldProps, "onChange" | "onBlur" | "fieldRef">;

function FileInput({
  onChange,
  onBlur,
  fieldRef,
  ...inputProps
}: FileInputProps) {
  const [input, setInput] = useState<HTMLInputElement | null>(null);
  useEffect(() => {
    fieldRef(input && { focus: () => input.focus() });
    return () => fieldRef(null);
  }, [input, fieldRef]);

  // Counts choices so a slow measure of an older file can't overwrite a newer one.
  const latestChoice = useRef(0);
  useEffect(() => {
    // A measure that finishes after the field is gone must not report.
    return () => {
      latestChoice.current = -1;
    };
  }, []);

  async function measureChosenFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const choice = ++latestChoice.current;
    const image = await measureImage(file);
    if (choice === latestChoice.current) onChange(image);
  }

  return (
    <Input
      {...inputProps}
      ref={setInput}
      type="file"
      accept={ACCEPTED_IMAGE_TYPES.join(",")}
      onChange={measureChosenFile}
      onBlur={onBlur}
    />
  );
}

/**
 * The course image's file picker, with the page's preview, the state icon and
 * the error message.
 */
export function ImageField({
  preview,
  onChange,
  onBlur,
  fieldRef,
  error,
  isTouched,
  isSubmitted,
}: ImageFieldProps) {
  return (
    <ValidatedField
      label="Image"
      description="JPEG, PNG or WebP, up to 5 MB, at least 800 × 450 pixels. It is shown at 16:9."
      error={error}
      isTouched={isTouched}
      isSubmitted={isSubmitted}
    >
      {(inputProps) => (
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <FileInput
            id={inputProps.id}
            aria-invalid={inputProps["aria-invalid"]}
            aria-describedby={inputProps["aria-describedby"]}
            onChange={onChange}
            onBlur={onBlur}
            fieldRef={fieldRef}
          />
          {preview}
        </div>
      )}
    </ValidatedField>
  );
}
