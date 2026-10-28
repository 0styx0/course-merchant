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

  describe("links", () => {
    /** An editor whose first word is a link and whose cursor is inside it. */
    function editorWithCursorInLink() {
      editor = new Editor({
        extensions: descriptionExtensions,
        content: '<p><a href="https://old.example.com">Welcome</a> home</p>',
      });
      editor.commands.setTextSelection(3);
      return editor;
    }

    async function openLinkField(user: ReturnType<typeof userEvent.setup>) {
      await user.click(screen.getByRole("button", { name: "Link" }));
      return screen.getByRole("textbox", { name: "Link address" });
    }

    it("links the selected text to the typed address", async () => {
      const user = userEvent.setup();
      const editor = editorWithSelectedText();
      renderToolbar(editor);

      const input = await openLinkField(user);
      expect(input).toHaveFocus();
      await user.type(input, " https://example.com/a {Enter}");

      expect(editor.getAttributes("link").href).toBe("https://example.com/a");
      expect(
        screen.queryByRole("textbox", { name: "Link address" }),
      ).not.toBeInTheDocument();
    });

    it("undoes an added link", async () => {
      const user = userEvent.setup();
      const editor = editorWithSelectedText();
      renderToolbar(editor);

      await user.type(await openLinkField(user), "https://example.com{Enter}");
      editor.commands.undo();

      expect(editor.isActive("link")).toBe(false);
    });

    it.each([
      ["", "Enter an address"],
      ["example.com", "Start the address with https://"],
      ["ftp://example.com", "Start the address with https://"],
    ])("refuses %j with a message", async (address, message) => {
      const user = userEvent.setup();
      const editor = editorWithSelectedText();
      renderToolbar(editor);

      const input = await openLinkField(user);
      if (address) await user.type(input, address);
      await user.click(screen.getByRole("button", { name: "Apply" }));

      expect(screen.getByRole("alert")).toHaveTextContent(message);
      expect(input).toHaveAttribute("aria-invalid", "true");
      expect(editor.isActive("link")).toBe(false);
    });

    it("starts with the link's address and changes the whole link", async () => {
      const user = userEvent.setup();
      const editor = editorWithCursorInLink();
      renderToolbar(editor);

      const input = await openLinkField(user);
      expect(input).toHaveValue("https://old.example.com");
      await user.clear(input);
      await user.type(input, "https://new.example.com{Enter}");

      expect(editor.getJSON().content?.[0].content?.[0]).toMatchObject({
        text: "Welcome",
        marks: [{ type: "link", attrs: { href: "https://new.example.com" } }],
      });
    });

    it("removes the whole link", async () => {
      const user = userEvent.setup();
      const editor = editorWithCursorInLink();
      renderToolbar(editor);

      await user.click(screen.getByRole("button", { name: "Remove link" }));

      expect(editor.getHTML()).not.toContain("<a");
      expect(editor.getText()).toBe("Welcome home");
    });

    it("closes with Escape and leaves the document alone", async () => {
      const user = userEvent.setup();
      const editor = editorWithSelectedText();
      renderToolbar(editor);

      await user.type(await openLinkField(user), "https://example.com{Escape}");

      expect(
        screen.queryByRole("textbox", { name: "Link address" }),
      ).not.toBeInTheDocument();
      expect(editor.isActive("link")).toBe(false);
    });

    it("disables Link without a selection and Remove link off a link", () => {
      editor = new Editor({
        extensions: descriptionExtensions,
        content: "<p>Welcome</p>",
      });
      renderToolbar(editor);

      expect(screen.getByRole("button", { name: "Link" })).toHaveAttribute(
        "aria-disabled",
        "true",
      );
      expect(
        screen.getByRole("button", { name: "Remove link" }),
      ).toHaveAttribute("aria-disabled", "true");
    });
  });
});
