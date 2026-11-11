"use client";

import type { Editor, JSONContent } from "@tiptap/core";
import { CharacterCount as CharacterCountExtension } from "@tiptap/extensions";
import { EditorContent, useEditor } from "@tiptap/react";
import { useCallback, useEffect } from "react";

import { CharacterCount } from "@/components/form/character-count";
import {
  ValidatedField,
  type ValidatedFieldInputProps,
} from "@/components/form/validated-field";
import { toCourseDescription } from "@/features/course-description/description-document";
import { descriptionExtensions } from "@/features/course-description/description-extensions";

import { COURSE_DESCRIPTION_MAX_TEXT_LENGTH } from "../validation/course-form-limits";
import { DescriptionToolbar } from "./description-toolbar";

type DescriptionEditorProps = {
  value: JSONContent;
  onChange: (description: JSONContent) => void;
  onBlur: () => void;
  /** react-hook-form's `field.ref`: lets it and the error list focus the editor. */
  fieldRef: (handle: { focus: () => void } | null) => void;
  error?: string;
  isTouched: boolean;
  isSubmitted: boolean;
};

// No `limit` option: the extension would block typing past it, and the form
// shows the error instead.
const editorExtensions = [...descriptionExtensions, CharacterCountExtension];

const EDITABLE_AREA_CLASSES =
  "description-content min-h-40 w-full rounded-md border border-input bg-card px-4 py-3 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-invalid:border-destructive";

function useDescriptionEditor({
  value,
  onChange,
  onBlur,
  fieldRef,
}: Pick<DescriptionEditorProps, "value" | "onChange" | "onBlur" | "fieldRef">) {
  const editor = useEditor({
    extensions: editorExtensions,
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

  return { editor, focus };
}

/**
 * The course description's rich-text field, with the label, formatting
 * toolbar, state icon, error message and a character counter around it.
 */
export function DescriptionEditor({
  value,
  onChange,
  onBlur,
  fieldRef,
  error,
  isTouched,
  isSubmitted,
}: DescriptionEditorProps) {
  const { editor, focus } = useDescriptionEditor({
    value,
    onChange,
    onBlur,
    fieldRef,
  });

  // `value` changes on every edit, which re-renders and so refreshes the count.
  const count = editor?.storage.characterCount.characters() ?? 0;

  return (
    <ValidatedField
      label="Description"
      description={
        <CharacterCount
          count={count}
          limit={COURSE_DESCRIPTION_MAX_TEXT_LENGTH}
        />
      }
      error={error}
      isTouched={isTouched}
      isSubmitted={isSubmitted}
      onLabelClick={focus}
    >
      {(inputProps) => (
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <DescriptionToolbar editor={editor} controlsId={inputProps.id} />
          <EditableArea editor={editor} {...inputProps} />
        </div>
      )}
    </ValidatedField>
  );
}

type EditableAreaProps = ValidatedFieldInputProps & { editor: Editor | null };

// The ids and ARIA values only exist inside ValidatedField's render function, so
// they reach the editable element through the editor's options.
function EditableArea({
  editor,
  id,
  labelId,
  "aria-invalid": isInvalid,
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
          "aria-invalid": String(Boolean(isInvalid)),
          class: EDITABLE_AREA_CLASSES,
        },
      },
    });
  }, [editor, id, labelId, isInvalid, ariaDescribedBy]);

  return <EditorContent editor={editor} className="min-w-0 flex-1" />;
}
