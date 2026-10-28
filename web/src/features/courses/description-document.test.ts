import type { JSONContent } from "@tiptap/core";
import { describe, expect, it } from "vitest";

import {
  countDescriptionCharacters,
  hasVisibleText,
  toCourseDescription,
} from "./description-document";

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
  it("keeps only the href of a link", () => {
    const link = {
      type: "link",
      attrs: {
        href: "https://example.com",
        target: null,
        rel: "noopener noreferrer nofollow",
        class: null,
      },
    };

    expect(toCourseDescription(doc(paragraph(text("hi", [link]))))).toEqual(
      doc(
        paragraph(
          text("hi", [
            { type: "link", attrs: { href: "https://example.com" } },
          ]),
        ),
      ),
    );
  });

  it("keeps the heading level and the ordered list start, drops other attributes", () => {
    const result = toCourseDescription(
      doc(
        { type: "heading", attrs: { level: 2, id: "x" }, content: [text("A")] },
        {
          type: "orderedList",
          attrs: { start: 3, type: null },
          content: [{ type: "listItem", content: [paragraph(text("one"))] }],
        },
      ),
    );

    expect(result.content[0]).toEqual({
      type: "heading",
      attrs: { level: 2 },
      content: [text("A")],
    });
    expect(result.content[1]).toMatchObject({ attrs: { start: 3 } });
  });

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
