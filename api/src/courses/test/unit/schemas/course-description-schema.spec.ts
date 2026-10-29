import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { ValidationException } from "@/common/errors/validation.exception.js";
import { ZodValidationPipe } from "@/common/validation/zod-validation.pipe.js";
import { descriptionDocumentSchema } from "@/courses/validation/course-description-schema.js";

type Node = Record<string, unknown>;

const paragraph = (...content: Node[]): Node => ({
  type: "paragraph",
  content,
});
const text = (value: string, marks?: Node[]): Node =>
  marks ? { type: "text", text: value, marks } : { type: "text", text: value };
const doc = (...content: Node[]): Node => ({ type: "doc", content });
const link = (href: string): Node => ({ type: "link", attrs: { href } });

function issuesFor(value: unknown) {
  try {
    new ZodValidationPipe(descriptionDocumentSchema).transform(value, {
      type: "body",
    });
    return [];
  } catch (error) {
    if (error instanceof ValidationException) {
      return error.errors.map(({ field, code }) => ({ field, code }));
    }

    throw error;
  }
}

describe("descriptionDocumentSchema", () => {
  it("accepts formatting, lists and safe links", () => {
    const value = doc(
      { type: "heading", attrs: { level: 2 }, content: [text("Intro")] },
      paragraph(
        text("Bold", [{ type: "bold" }]),
        text(" and "),
        text("a link", [link("https://example.com")]),
        text(" or ", []),
        text("call", [link("tel:+15551234567")]),
        text("mail", [link("mailto:a@example.com")]),
      ),
      {
        type: "bulletList",
        content: [{ type: "listItem", content: [paragraph(text("One"))] }],
      },
    );

    expect(issuesFor(value)).toEqual([]);
  });

  it("accepts text at the maximum length", () => {
    expect(issuesFor(doc(paragraph(text("a".repeat(5000)))))).toEqual([]);
  });

  it("drops attributes the editor doesn't know instead of storing them", () => {
    const result = descriptionDocumentSchema.safeParse(
      doc({ ...paragraph(text("Hi")), attrs: { evil: 1 } }),
    );

    expect(result.success && JSON.stringify(result.data)).not.toContain("evil");
  });

  it.each([
    ["a string", "Learn React"],
    ["a non-doc root", { type: "paragraph", content: [] }],
    ["an empty doc", doc()],
    ["an unknown node", doc({ type: "script", content: [text("x")] })],
    ["an unknown mark", doc(paragraph(text("x", [{ type: "blink" }])))],
    ["text directly under doc", doc(text("x"))],
    ["a code block", doc({ type: "codeBlock", content: [text("x")] })],
  ])("refuses %s", (_name, value) => {
    expect(issuesFor(value)).not.toEqual([]);
  });

  it.each([
    "javascript:alert(1)",
    "JAVASCRIPT:alert(1)",
    " javascript:alert(1)",
    "java\tscript:alert(1)",
    "data:text/html,x",
    "/relative",
    `https://example.com/${"a".repeat(2048)}`,
  ])("refuses the link %j at its pointer", (href) => {
    expect(issuesFor(doc(paragraph(text("x", [link(href)]))))).toEqual([
      {
        field: "/content/0/content/0/marks/0/attrs/href",
        code: "INVALID_VALUE",
      },
    ]);
  });

  it.each([
    ["a null character", "a\0b"],
    ["an unpaired surrogate", "a\ud800b"],
  ])("refuses %s, which the database would reject", (_name, value) => {
    expect(issuesFor(doc(paragraph(text(value))))).toEqual([
      { field: "/content/0/content/0/text", code: "INVALID_VALUE" },
    ]);
  });

  it("lists every bad text first, then every bad link", () => {
    const value = doc(
      paragraph(text("a", [link("/relative")]), text("b\0")),
      paragraph(text("c\0")),
    );

    expect(issuesFor(value)).toEqual([
      { field: "/content/0/content/1/text", code: "INVALID_VALUE" },
      { field: "/content/1/content/0/text", code: "INVALID_VALUE" },
      {
        field: "/content/0/content/0/marks/0/attrs/href",
        code: "INVALID_VALUE",
      },
    ]);
  });

  it.each([
    ["only spaces", "   "],
    ["only non-breaking spaces", "  "],
    ["only line breaks", "\n\n"],
  ])("refuses %s", (_name, value) => {
    expect(issuesFor(doc(paragraph(text(value))))).toEqual([
      { field: "", code: "TOO_SHORT" },
    ]);
  });

  it("refuses a description with no text at all", () => {
    expect(issuesFor(doc({ type: "paragraph" }))).toEqual([
      { field: "", code: "TOO_SHORT" },
    ]);
  });

  it("refuses more than the maximum length, counting text across nodes", () => {
    const value = doc(
      paragraph(text("a".repeat(3000))),
      paragraph(text("a".repeat(2001))),
    );

    expect(issuesFor(value)).toEqual([{ field: "", code: "TOO_LONG" }]);
  });
});

describe("description-extensions.ts", () => {
  it("is identical to the web's copy", () => {
    const read = (path: string) =>
      readFileSync(new URL(path, import.meta.url), "utf8");

    expect(read("../../../validation/description-extensions.ts")).toBe(
      read(
        "../../../../../../web/src/features/course-description/description-extensions.ts",
      ),
    );
  });
});
