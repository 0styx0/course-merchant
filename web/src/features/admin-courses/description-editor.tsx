"use client";

import type { Editor, JSONContent } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import { useCallback, useEffect } from "react";

import {
  FormField,
  type FormFieldInputProps,
} from "@/components/form/form-field";
import { cn } from "cn";
import {
  countDescriptionCharacters,
  toCourseDescription,
} from "@/features/courses/description-document";
import { descriptionExtensions } from "@/features/courses/description-extensions";

import { COURSE_DESCRIPTION_MAX_TEXT_LENGTH } from "./course-form-limits";

type DescriptionEditorProps = {
  value: JSONContent;
  onChange: (description: JSONContent) => void;
  onBlur: () => void;
  /** react-hook-form's `field.ref`: lets it and the error list focus the editor. */
  fieldRef: (handle: { focus: () => void } | null) => void;
  error?: string;
  touched: boolean;
  submitted: boolean;
};

const EDITABLE_AREA_CLASSES =
  "description-content min-h-40 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30";

/**
 * The course description's rich-text field, with the label, state icon, error
 * message and a character counter around it. The counter is a plain
 * description, not a live region, so it isn't read out on every keystroke.
 * Typing past the limit is never blocked: the counter turns red and the form
 * shows the error.
 */
export function DescriptionEditor({
  value,
  onChange,
  onBlur,
  fieldRef,
  error,
  touched,
  submitted,
}: DescriptionEditorProps) {
  const editor = useEditor({
    extensions: descriptionExtensions,
    content: value,
    // Create the editor only in the browser, so the server's HTML can't differ
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(toCourseDescription(editor.getJSON())),
    onBlur,
  });

  const focus = useCallback(() => {
    editor?.commands.focus();
  }, [editor]);

  useEffect(() => {
    fieldRef({ focus });
    return () => fieldRef(null);
  }, [focus, fieldRef]);

  const count = countDescriptionCharacters(value);
  const overLimit = count > COURSE_DESCRIPTION_MAX_TEXT_LENGTH;

  return (
    <FormField
      label="Description"
      description={
        <span className={cn(overLimit && "text-destructive")}>
          {count.toLocaleString("en-US")} /{" "}
          {COURSE_DESCRIPTION_MAX_TEXT_LENGTH.toLocaleString("en-US")}
        </span>
      }
      error={error}
      touched={touched}
      submitted={submitted}
      onLabelClick={focus}
    >
      {(inputProps) => <EditableArea editor={editor} {...inputProps} />}
    </FormField>
  );
}

type EditableAreaProps = FormFieldInputProps & { editor: Editor | null };

// The ids and ARIA values only exist inside FormField's render function, so
// they reach the editable element through the editor's options.
function EditableArea({
  editor,
  id,
  labelId,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: EditableAreaProps) {
  useEffect(() => {
    editor?.setOptions({
      editorProps: {
        attributes: {
          ...(id && { id }),
          ...(labelId && { "aria-labelledby": labelId }),
          ...(ariaDescribedBy && { "aria-describedby": ariaDescribedBy }),
          role: "textbox",
          "aria-multiline": "true",
          "aria-invalid": String(Boolean(ariaInvalid)),
          class: EDITABLE_AREA_CLASSES,
        },
      },
    });
  }, [editor, id, labelId, ariaInvalid, ariaDescribedBy]);

  return <EditorContent editor={editor} className="min-w-0 flex-1" />;
}
