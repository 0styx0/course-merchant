"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";

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
  value: ChosenImage | null;
  onChange: (image: ChosenImage) => void;
  onBlur: () => void;
  /** react-hook-form's `field.ref`: lets it and the error list focus the input. */
  fieldRef: (handle: { focus: () => void } | null) => void;
  error?: string;
  touched: boolean;
  submitted: boolean;
};

/** A temporary address for showing the file; released when the file changes or the field goes. */
function useObjectUrl(file: File | undefined) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    // The address exists only in the browser, so it can't be made during render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  return file ? url : undefined;
}

function ImagePreview({ file }: { file: File }) {
  const url = useObjectUrl(file);
  if (!url) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- a local blob, not optimizable
    <img
      src={url}
      alt="Preview of the chosen image"
      className="aspect-video w-full rounded-lg border object-cover object-center"
    />
  );
}

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

  async function onFileChosen(event: ChangeEvent<HTMLInputElement>) {
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
      onChange={onFileChosen}
      onBlur={onBlur}
    />
  );
}

/**
 * The course image's file picker, with a 16:9 preview cropped like the public
 * pages, the state icon and the error message. A refused file keeps its preview.
 */
export function ImageField({
  value,
  onChange,
  onBlur,
  fieldRef,
  error,
  touched,
  submitted,
}: ImageFieldProps) {
  const hasPreview = value !== null && value.width > 0;
  return (
    <ValidatedField
      label="Image"
      description="JPEG, PNG or WebP, up to 5 MB, at least 800 × 450 pixels. It is shown at 16:9."
      error={error}
      touched={touched}
      submitted={submitted}
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
          {hasPreview && <ImagePreview file={value.file} />}
        </div>
      )}
    </ValidatedField>
  );
}
