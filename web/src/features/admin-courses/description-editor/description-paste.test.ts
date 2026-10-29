import { Editor, type JSONContent } from "@tiptap/core";
import { readFileSync } from "node:fs";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { toCourseDescription } from "@/features/courses/description-document";
import { descriptionExtensions } from "@/features/courses/description-extensions";

const googleDocsPaste = readFileSync(
  "src/mocks/fixtures/google-docs-paste.html",
  "utf8",
);

let editor: Editor | undefined;

afterEach(() => editor?.destroy());

// jsdom has neither class, and `pasteHTML` builds a paste event from them
class FakeDataTransfer {
  private data = new Map<string, string>();
  setData(type: string, value: string) {
    this.data.set(type, value);
  }
  getData(type: string) {
    return this.data.get(type) ?? "";
  }
}
class FakeClipboardEvent extends Event {
  clipboardData: unknown;
  constructor(type: string, init?: { clipboardData?: unknown }) {
    super(type);
    this.clipboardData = init?.clipboardData;
  }
}

beforeAll(() => {
  vi.stubGlobal("DataTransfer", FakeDataTransfer);
  vi.stubGlobal("ClipboardEvent", FakeClipboardEvent);
});
afterAll(() => vi.unstubAllGlobals());

/** What the API would receive after `html` is pasted into an empty editor. */
function paste(html: string): JSONContent[] {
  editor = new Editor({
    extensions: descriptionExtensions,
    element: document.createElement("div"),
  });
  editor.view.pasteHTML(html);
  return toCourseDescription(editor.getJSON()).content ?? [];
}

const text = (block: JSONContent) =>
  (block.content ?? []).map((node) => node.text ?? "").join("");

describe("pasting from Google Docs", () => {
  it("keeps bold and italic", () => {
    const [, formatted] = paste(googleDocsPaste);

    expect(formatted.content).toEqual([
      { type: "text", text: "Bold text", marks: [{ type: "bold" }] },
      { type: "text", text: " and " },
      { type: "text", text: "italic text", marks: [{ type: "italic" }] },
    ]);
  });

  it("keeps headings 2 to 4 and turns the Title and heading 1 into paragraphs", () => {
    const blocks = paste(googleDocsPaste);

    expect(
      blocks.map((block) => [block.type, block.attrs?.level, text(block)]),
    ).toEqual(
      expect.arrayContaining([
        ["paragraph", undefined, "Sample Document Title"],
        ["paragraph", undefined, "Heading one"],
        ["heading", 2, "Heading two"],
        ["heading", 3, "Heading three"],
        ["heading", 4, "Heading four"],
      ]),
    );
  });

  it("puts a nested list inside its item", () => {
    const bulletList = paste(googleDocsPaste).find(
      (block) => block.type === "bulletList",
    );

    const items = bulletList?.content ?? [];
    expect(items.map((item) => text(item.content![0]))).toEqual([
      "Item one",
      "Item two",
    ]);
    expect(items[0].content![1].type).toBe("bulletList");
    expect(text(items[0].content![1].content![0].content![0])).toBe(
      "Nested item",
    );
  });

  it("keeps links, including the ones to the document's own headings", () => {
    const hrefs = paste(googleDocsPaste).flatMap((block) =>
      (block.content ?? []).flatMap((node) =>
        (node.marks ?? []).flatMap((mark) =>
          mark.type === "link" ? [mark.attrs!.href] : [],
        ),
      ),
    );

    expect(hrefs).toEqual([
      "https://example.com/page",
      ...["Heading one", "Heading two", "Heading three", "Heading four"].map(
        () => expect.stringContaining("https://docs.google.com/document/d/"),
      ),
    ]);
  });

  it("keeps table text as paragraphs", () => {
    const paragraphs = paste(googleDocsPaste).map(text);

    expect(paragraphs).toEqual(
      expect.arrayContaining(["A1", "B1", "A2", "B2"]),
    );
  });
});

describe("pasting HTML the Docs sample doesn't have", () => {
  it("keeps the number a pasted numbered list starts at", () => {
    const [list] = paste('<ol start="3"><li><p>Third</p></li></ol>');

    expect(list.attrs).toMatchObject({ start: 3 });
  });

  it("drops an image", () => {
    const blocks = paste('<p>Before</p><img src="https://example.com/a.png">');

    expect(JSON.stringify(blocks)).not.toContain("img");
    expect(blocks.map(text)).toEqual(["Before"]);
  });
});
