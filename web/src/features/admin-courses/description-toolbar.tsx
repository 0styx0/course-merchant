"use client";

import { Toolbar } from "@base-ui/react/toolbar";
import type { Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  type LucideIcon,
} from "lucide-react";

import { Toggle } from "@/components/ui/toggle";

type Format = {
  label: string;
  Icon: LucideIcon;
  isActive: (editor: Editor) => boolean;
  toggle: (editor: Editor) => void;
};

// Each button is one Tiptap chain command, so Ctrl+Z undoes it
const FORMATS: Format[] = [
  {
    label: "Bold",
    Icon: Bold,
    isActive: (editor) => editor.isActive("bold"),
    toggle: (editor) => editor.chain().focus().toggleBold().run(),
  },
  {
    label: "Italic",
    Icon: Italic,
    isActive: (editor) => editor.isActive("italic"),
    toggle: (editor) => editor.chain().focus().toggleItalic().run(),
  },
  {
    label: "Heading",
    Icon: Heading2,
    isActive: (editor) => editor.isActive("heading", { level: 2 }),
    toggle: (editor) =>
      editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    label: "Subheading",
    Icon: Heading3,
    isActive: (editor) => editor.isActive("heading", { level: 3 }),
    toggle: (editor) =>
      editor.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    label: "Bulleted list",
    Icon: List,
    isActive: (editor) => editor.isActive("bulletList"),
    toggle: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    label: "Numbered list",
    Icon: ListOrdered,
    isActive: (editor) => editor.isActive("orderedList"),
    toggle: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
];

type DescriptionToolbarProps = {
  /** Null until the editor exists, which is only in the browser. */
  editor: Editor | null;
  /** The editable area's id. */
  controlsId?: string;
};

/**
 * The formatting buttons above the description editor. Each shows as pressed
 * while its format applies at the cursor. A mouse click keeps focus in the
 * editor, so the field isn't marked as touched and the selection stays.
 */
export function DescriptionToolbar({
  editor,
  controlsId,
}: DescriptionToolbarProps) {
  const active = useEditorState({
    editor,
    selector: ({ editor }) =>
      FORMATS.map((format) => (editor ? format.isActive(editor) : false)),
  });

  return (
    <Toolbar.Root
      aria-label="Formatting"
      aria-controls={controlsId}
      className="flex flex-wrap gap-1"
    >
      {FORMATS.map((format, index) => (
        <Toolbar.Button
          key={format.label}
          disabled={!editor}
          onMouseDown={(event) => event.preventDefault()}
          render={
            <Toggle
              aria-label={format.label}
              title={format.label}
              pressed={active?.[index] ?? false}
              onPressedChange={() => editor && format.toggle(editor)}
            />
          }
        >
          <format.Icon aria-hidden />
        </Toolbar.Button>
      ))}
    </Toolbar.Root>
  );
}
