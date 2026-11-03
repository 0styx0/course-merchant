"use client";

import { Toolbar } from "@base-ui/react/toolbar";
import type { Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  Link,
  List,
  ListOrdered,
  type LucideIcon,
  Unlink,
} from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";

import { DescriptionLinkField } from "./link/description-link-field";

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

type EditorState = { isOnLink: boolean; hasSelection: boolean } | null;

// A mouse press on a button would blur the editor, losing the selection
const preventBlur = (event: React.MouseEvent) => event.preventDefault();

function removeLink(editor: Editor | null) {
  editor?.chain().focus().extendMarkRange("link").unsetLink().run();
}

type FormatButtonProps = {
  editor: Editor | null;
  format: Format;
  isPressed: boolean;
};

function FormatButton({ editor, format, isPressed }: FormatButtonProps) {
  return (
    <Toolbar.Button
      disabled={!editor}
      onMouseDown={preventBlur}
      render={
        <Toggle
          aria-label={format.label}
          title={format.label}
          pressed={isPressed}
          onPressedChange={() => editor && format.toggle(editor)}
        />
      }
    >
      <format.Icon aria-hidden />
    </Toolbar.Button>
  );
}

type LinkButtonProps = {
  editor: Editor | null;
  state: EditorState;
  isOpen: boolean;
  panelId: string;
  onToggle: () => void;
};

/** A link needs selected text to wrap, or an existing link to edit. */
function isLinkButtonDisabled(editor: Editor | null, state: EditorState) {
  return !editor || !(state?.isOnLink || state?.hasSelection);
}

function LinkButton({
  editor,
  state,
  isOpen,
  panelId,
  onToggle,
}: LinkButtonProps) {
  return (
    <Toolbar.Button
      disabled={isLinkButtonDisabled(editor, state)}
      onMouseDown={preventBlur}
      render={
        <Toggle
          aria-label="Link"
          title="Link (select text first)"
          aria-expanded={isOpen}
          aria-controls={isOpen ? panelId : undefined}
          pressed={isOpen || (state?.isOnLink ?? false)}
          onPressedChange={onToggle}
        />
      }
    >
      <Link aria-hidden />
    </Toolbar.Button>
  );
}

type RemoveLinkButtonProps = {
  editor: Editor | null;
  isDisabled: boolean;
};

function RemoveLinkButton({ editor, isDisabled }: RemoveLinkButtonProps) {
  return (
    <Toolbar.Button
      disabled={isDisabled}
      onMouseDown={preventBlur}
      render={
        <Button
          variant="ghost"
          size="icon"
          aria-label="Remove link"
          title="Remove link"
          onClick={() => removeLink(editor)}
        />
      }
    >
      <Unlink aria-hidden />
    </Toolbar.Button>
  );
}

function useToolbarState(editor: Editor | null) {
  return useEditorState({
    editor,
    selector: ({ editor }) => ({
      active: FORMATS.map((format) =>
        editor ? format.isActive(editor) : false,
      ),
      isOnLink: editor?.isActive("link") ?? false,
      hasSelection: editor ? !editor.state.selection.empty : false,
    }),
  });
}

function FormatButtons({
  editor,
  active,
}: {
  editor: Editor | null;
  active: boolean[] | undefined;
}) {
  return FORMATS.map((format, index) => (
    <FormatButton
      key={format.label}
      editor={editor}
      format={format}
      isPressed={active?.[index] ?? false}
    />
  ));
}

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
  const linkFieldId = useId();
  const [isLinkFieldOpen, setIsLinkFieldOpen] = useState(false);
  const state = useToolbarState(editor);

  return (
    <div className="flex flex-col gap-1">
      <Toolbar.Root
        aria-label="Formatting"
        aria-controls={controlsId}
        className="flex flex-wrap gap-1"
      >
        <FormatButtons editor={editor} active={state?.active} />
        <LinkButton
          editor={editor}
          state={state}
          isOpen={isLinkFieldOpen}
          panelId={linkFieldId}
          onToggle={() => setIsLinkFieldOpen((isOpen) => !isOpen)}
        />
        <RemoveLinkButton
          editor={editor}
          isDisabled={!editor || !state?.isOnLink}
        />
      </Toolbar.Root>
      {editor && isLinkFieldOpen && (
        <DescriptionLinkField
          editor={editor}
          id={linkFieldId}
          onClose={() => setIsLinkFieldOpen(false)}
        />
      )}
    </div>
  );
}
