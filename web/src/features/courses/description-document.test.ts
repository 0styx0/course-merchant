import { Editor, type JSONContent } from "@tiptap/core";
import { CharacterCount } from "@tiptap/extensions";
import { describe, expect, it } from "vitest";

import {
  countDescriptionCharacters,
  hasVisibleText,
  toCourseDescription,
} from "./description-document";
import { descriptionExtensions } from "./description-extensions";

const text = (value: string, marks?: JSONContent["marks"]): JSONContent => ({
  type: "text",
  text: value,
  ...(marks && { marks }),
});
const paragraph = (...content: JSONContent[]): JSONContent => ({
  type: "paragraph",
  ...(content.length && { content }),
});
const doc = (...content: JSONContent[]): JSONContent => ({
  type: "doc",
  content,
});

describe("toCourseDescription", () => {
  it("drops empty paragraphs but keeps line breaks, marks and nested lists", () => {
    const nested: JSONContent = {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [
            paragraph(text("a", [{ type: "bold" }]), { type: "hardBreak" }),
            {
              type: "bulletList",
              content: [{ type: "listItem", content: [paragraph(text("b"))] }],
            },
          ],
        },
      ],
    };

    expect(toCourseDescription(doc(paragraph(), nested, paragraph()))).toEqual(
      doc(nested),
    );
  });

  it("sends the attributes the editor adds as they are", () => {
    const heading = {
      type: "heading",
      attrs: { level: 2 },
      content: [text("A")],
    };

    expect(toCourseDescription(doc(heading))).toEqual(doc(heading));
  });

  it("does not change its input", () => {
    const input = doc(
      paragraph(),
      paragraph(
        text("hi", [
          { type: "link", attrs: { href: "https://a.b", class: "x" } },
        ]),
      ),
    );
    const copy = structuredClone(input);

    toCourseDescription(input);

    expect(input).toEqual(copy);
  });
});

describe("countDescriptionCharacters", () => {
  it("sums text across nested nodes", () => {
    const nested = doc(paragraph(text("ab"), text("cd", [{ type: "bold" }])), {
      type: "bulletList",
      content: [{ type: "listItem", content: [paragraph(text("efg"))] }],
    });

    expect(countDescriptionCharacters(nested)).toBe(7);
  });

  it("counts an emoji as two, like the API", () => {
    expect(countDescriptionCharacters(doc(paragraph(text("😀"))))).toBe(2);
  });

  it("counts an empty document as zero", () => {
    expect(countDescriptionCharacters({ type: "doc", content: [] })).toBe(0);
  });

  it("matches the count Tiptap's CharacterCount extension shows", () => {
    const withBreak = doc(
      paragraph(text("ab"), { type: "hardBreak" }, text("cd")),
      { type: "horizontalRule" },
      paragraph(text("ef")),
    );
    const editor = new Editor({
      extensions: [...descriptionExtensions, CharacterCount],
      content: withBreak,
    });

    expect(countDescriptionCharacters(withBreak)).toBe(
      editor.storage.characterCount.characters(),
    );
    editor.destroy();
  });
});

describe("hasVisibleText", () => {
  it.each([
    ["no text", doc(paragraph())],
    ["spaces", doc(paragraph(text("   ")))],
    ["non-breaking spaces", doc(paragraph(text("  ")))],
    ["line breaks", doc(paragraph(text("\n\n")))],
  ])("is false for %s", (_label, input) => {
    expect(hasVisibleText(input)).toBe(false);
  });

  it("is true for one letter", () => {
    expect(hasVisibleText(doc(paragraph(text(" a "))))).toBe(true);
  });
});
