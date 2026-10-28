import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Editor } from "@tiptap/core";
import { afterEach, describe, expect, it } from "vitest";

import { descriptionExtensions } from "@/features/courses/description-extensions";

import { DescriptionToolbar } from "./description-toolbar";

let editor: Editor | undefined;

afterEach(() => editor?.destroy());

/** An editor holding one paragraph, with all of its text selected. */
function editorWithSelectedText() {
  editor = new Editor({
    extensions: descriptionExtensions,
    content: "<p>Welcome</p>",
  });
  editor.commands.setTextSelection({ from: 1, to: 8 });
  return editor;
}

function renderToolbar(editor: Editor | null) {
  render(<DescriptionToolbar editor={editor} controlsId="description" />);
  return screen.getByRole("toolbar", { name: "Formatting" });
}

describe("DescriptionToolbar", () => {
  it.each([
    ["Bold", "bold", undefined],
    ["Italic", "italic", undefined],
    ["Heading", "heading", { level: 2 }],
    ["Subheading", "heading", { level: 3 }],
    ["Bulleted list", "bulletList", undefined],
    ["Numbered list", "orderedList", undefined],
  ])(
    "%s toggles its format and shows as pressed",
    async (label, type, attrs) => {
      const user = userEvent.setup();
      const editor = editorWithSelectedText();
      renderToolbar(editor);
      const button = screen.getByRole("button", { name: label });
      expect(button).toHaveAttribute("aria-pressed", "false");

      await user.click(button);
      expect(editor.isActive(type, attrs)).toBe(true);
      expect(button).toHaveAttribute("aria-pressed", "true");

      await user.click(button);
      expect(editor.isActive(type, attrs)).toBe(false);
      expect(button).toHaveAttribute("aria-pressed", "false");
    },
  );

  it("is undone by the editor's undo", async () => {
    const user = userEvent.setup();
    const editor = editorWithSelectedText();
    renderToolbar(editor);

    await user.click(screen.getByRole("button", { name: "Bold" }));
    editor.commands.undo();

    expect(editor.isActive("bold")).toBe(false);
    expect(editor.getText()).toBe("Welcome");
  });

  it("moves between buttons with the arrow keys", async () => {
    const user = userEvent.setup();
    renderToolbar(editorWithSelectedText());

    await user.tab();
    expect(screen.getByRole("button", { name: "Bold" })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("button", { name: "Italic" })).toHaveFocus();
  });

  it("disables every button until the editor exists", () => {
    renderToolbar(null);

    for (const button of screen.getAllByRole("button")) {
      expect(button).toHaveAttribute("aria-disabled", "true");
    }
  });
});
