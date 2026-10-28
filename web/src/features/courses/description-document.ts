import type { JSONContent } from "@tiptap/core";

import type { CourseDescriptionDocument } from "@/lib/types";

/**
 * Reduces the editor's JSON to the fields the API's contract knows, and drops
 * the empty paragraphs that Google Docs and the editor's trailing line leave.
 */
export function toCourseDescription(
  editorJson: JSONContent,
): CourseDescriptionDocument {
  const blocks = (editorJson.content ?? []).filter(
    (block) => !isEmptyParagraph(block),
  );

  return { type: "doc", content: blocks.map(toContractNode) };
}

/** Sum of the text lengths, counted with `.length` like the API. */
export function countDescriptionCharacters(node: JSONContent): number {
  return collectText(node).length;
}

/** False for spaces, non-breaking spaces or line breaks only, like the API. */
export function hasVisibleText(node: JSONContent): boolean {
  return /\S/u.test(collectText(node));
}

function isEmptyParagraph(node: JSONContent): boolean {
  return node.type === "paragraph" && !node.content?.length;
}

function collectText(node: JSONContent): string {
  return (node.text ?? "") + (node.content ?? []).map(collectText).join("");
}

function toContractNode(node: JSONContent): JSONContent & { type: string } {
  const type = node.type ?? "";
  const attrs = pick(node.attrs, nodeAttributes[type]);

  return {
    type,
    ...(node.text !== undefined && { text: node.text }),
    ...(attrs && { attrs }),
    ...(node.content && { content: node.content.map(toContractNode) }),
    ...(node.marks && { marks: node.marks.map(toContractMark) }),
  };
}

function toContractMark(
  mark: NonNullable<JSONContent["marks"]>[number],
): NonNullable<JSONContent["marks"]>[number] {
  const attrs = pick(mark.attrs, markAttributes[mark.type]);
  return { type: mark.type, ...(attrs && { attrs }) };
}

const nodeAttributes: Record<string, string[] | undefined> = {
  heading: ["level"],
  orderedList: ["start"],
};
const markAttributes: Record<string, string[] | undefined> = {
  link: ["href"],
};

// Undefined when nothing is kept, so the node carries no empty `attrs`.
function pick(
  attrs: Record<string, unknown> | undefined,
  keys: string[] | undefined,
): Record<string, unknown> | undefined {
  const kept = Object.entries(attrs ?? {}).filter(([key]) =>
    keys?.includes(key),
  );
  return kept.length ? Object.fromEntries(kept) : undefined;
}
